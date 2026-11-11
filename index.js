// dsh-presence — Host plugin.
// Watches a Windows HID Sensor Collection V2 IR presence sensor (via the WinRT
// HumanPresenceSensor API) and/or a normal webcam (face detection + face-size
// distance estimate) plus mouse movement, derives an away/present state from
// user-configurable rules, and injects a greeting prompt into a chosen DSH
// session when the user comes back.
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const inject = ['webServer']

const ROUTE_PREFIX = '/dsh-presence'
const BRIDGE_PATH = fileURLToPath(new URL('./bridge.ps1', import.meta.url))
const CAMERA_PATH = fileURLToPath(new URL('./camera.py', import.meta.url))
const PYDEP_DIR = fileURLToPath(new URL('./pydeps', import.meta.url))

const DEFAULTS = {
  sensorEnabled: true,
  cameraEnabled: false,
  // Keyboard and mouse share one idle clock: any keyboard or mouse activity
  // resets it, so "input" means "the user is using this computer".
  inputEnabled: true,
  sensorAwayDistanceCm: 200,
  sensorReturnDistanceCm: 100,
  cameraDevice: '',
  cameraFaceWidthCm: 14,
  cameraFovDeg: 60,
  cameraAbsentSeconds: 12,
  inputAwayIdleSeconds: 600,
  inputReturnIdleSeconds: 0,
  awaySources: ['sensor', 'camera', 'input'],
  returnSources: ['sensor', 'camera', 'input'],
  greetingEnabled: true,
  greetingSessionId: '',
  greetingText: '',
  cooldownSeconds: 120,
  pollIntervalMs: 500,
}

const SOURCE_KEYS = ['input', 'sensor', 'camera']
// Old rule values map onto the new checkbox lists so an existing config keeps
// roughly the same meaning after the upgrade.
const LEGACY_RULES = {
  sensor: ['sensor'],
  mouse: ['input'],
  either: ['sensor', 'camera', 'input'],
  both: ['sensor', 'input'],
}
const LEGACY_KEYS = { mouse: 'input' }

function toNumber(value, fallback, min, max) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function parseSources(value, legacy, fallback) {
  let list = null
  if (Array.isArray(value)) list = value
  else if (typeof value === 'string') list = value.split(',')
  else if (typeof legacy === 'string' && LEGACY_RULES[legacy]) list = LEGACY_RULES[legacy]
  if (!Array.isArray(list)) return fallback.slice()
  const picked = list.map((item) => {
    const key = String(item).trim().toLowerCase()
    return LEGACY_KEYS[key] ?? key
  })
  return SOURCE_KEYS.filter((key) => picked.includes(key))
}

function normalizeConfig(raw) {
  const cfg = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) }
  const awayCm = toNumber(cfg.sensorAwayDistanceCm, DEFAULTS.sensorAwayDistanceCm, 10, 2000)
  // The return threshold must stay below the away threshold, otherwise one
  // distance would satisfy both tests and the hysteresis band would vanish.
  const returnCm = Math.min(toNumber(cfg.sensorReturnDistanceCm, DEFAULTS.sensorReturnDistanceCm, 1, 2000), awayCm - 1)
  return {
    sensorEnabled: cfg.sensorEnabled !== false,
    cameraEnabled: cfg.cameraEnabled === true,
    inputEnabled: (cfg.inputEnabled ?? cfg.mouseEnabled) !== false,
    sensorAwayDistanceCm: awayCm,
    sensorReturnDistanceCm: returnCm,
    cameraDevice: typeof cfg.cameraDevice === 'string' ? cfg.cameraDevice.trim() : '',
    cameraFaceWidthCm: toNumber(cfg.cameraFaceWidthCm, DEFAULTS.cameraFaceWidthCm, 8, 30),
    cameraFovDeg: toNumber(cfg.cameraFovDeg, DEFAULTS.cameraFovDeg, 30, 120),
    cameraAbsentSeconds: toNumber(cfg.cameraAbsentSeconds, DEFAULTS.cameraAbsentSeconds, 1, 600),
    inputAwayIdleSeconds: toNumber(
      cfg.inputAwayIdleSeconds ?? cfg.mouseAwayIdleSeconds,
      DEFAULTS.inputAwayIdleSeconds,
      1,
      86400,
    ),
    inputReturnIdleSeconds: toNumber(
      cfg.inputReturnIdleSeconds ?? cfg.mouseReturnIdleSeconds,
      DEFAULTS.inputReturnIdleSeconds,
      0,
      86400,
    ),
    awaySources: parseSources(cfg.awaySources, cfg.awayRule, DEFAULTS.awaySources),
    returnSources: parseSources(cfg.returnSources, cfg.returnRule, DEFAULTS.returnSources),
    greetingEnabled: cfg.greetingEnabled !== false,
    greetingSessionId: typeof cfg.greetingSessionId === 'string' ? cfg.greetingSessionId.trim() : '',
    greetingText: typeof cfg.greetingText === 'string' ? cfg.greetingText : '',
    cooldownSeconds: toNumber(cfg.cooldownSeconds, DEFAULTS.cooldownSeconds, 0, 86400),
    pollIntervalMs: toNumber(cfg.pollIntervalMs, DEFAULTS.pollIntervalMs, 200, 5000),
  }
}

function defaultGreetingText() {
  // Sent as a normal user message so the session's agent greets you naturally,
  // instead of pasting a meta instruction into the conversation.
  return '我回来了，刚才离开了大约 {away}。'
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s} 秒`
  if (s < 3600) return `${Math.round(s / 60)} 分钟`
  const hours = Math.floor(s / 3600)
  const minutes = Math.round((s % 3600) / 60)
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
}

function readJsonBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim()
      if (!text) return resolve({})
      try {
        resolve(JSON.parse(text))
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  try {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(body),
    })
    res.end(body)
  } catch {
    try { res.destroy() } catch {}
  }
}

export function apply(ctx, rawConfig) {
  const cfg = normalizeConfig(rawConfig)
  const webServer = ctx.get('webServer')
  const log = ctx.logger ?? console

  // ── Presence engine state ────────────────────────────────────────────────
  const state = {
    // Assume the user is here when the plugin starts: opening the app is itself
    // evidence. A startup "unknown" would otherwise stay unknown until the mouse
    // moves or the idle threshold passes.
    presence: 'present',
    awayStartedAt: null,
    lastAwaySeconds: 0,
    sensorInfo: { available: false, reason: 'starting', deviceId: null, minMm: null, maxMm: null },
    sensorReading: { available: false, presence: null, distanceMm: null, error: null },
    cameraInfo: { available: false, reason: 'starting', device: null, width: null, height: null },
    cameraReading: { available: false, face: false, distanceCm: null, facePx: null, sceneEdge: null, error: null },
    cameraPid: null,
    cameraPython: null,
    cameraError: null,
    cameraRestarts: 0,
    lastCameraAt: null,
    lastFaceAt: null,
    cameraStartedAt: null,
    input: { idleSeconds: null, lastInputAt: null },
    inputActive: false,
    bridgePid: null,
    bridgeError: null,
    bridgeRestarts: 0,
    lastTickAt: null,
    lastGreeting: null,
    lastError: null,
    evidence: { input: 'disabled', sensor: 'disabled', camera: 'disabled' },
    updatedAt: Date.now(),
  }

  let child = null
  let disposed = false
  let restartTimer = null
  let buffer = ''
  let cameraChild = null
  let cameraBuffer = ''
  let cameraRestartTimer = null

  function sensorEvidence() {
    if (!cfg.sensorEnabled) return 'disabled'
    const s = state.sensorReading
    if (!s.available) return 'unavailable'
    const awayMm = cfg.sensorAwayDistanceCm * 10
    const returnMm = cfg.sensorReturnDistanceCm * 10
    const distance = typeof s.distanceMm === 'number' ? s.distanceMm : null
    if (s.presence === 'absent') return 'away'
    if (s.presence === 'present') {
      if (distance === null) return 'present'
      if (distance >= awayMm) return 'away'
      if (distance <= returnMm) return 'present'
      return 'hold'
    }
    // Presence unknown: distance is the only signal we have.
    if (distance === null) return 'unavailable'
    if (distance >= awayMm) return 'away'
    if (distance <= returnMm) return 'present'
    return 'hold'
  }

  function cameraEvidence() {
    if (!cfg.cameraEnabled) return 'disabled'
    const c = state.cameraReading
    if (!c.available) return 'unavailable'
    const now = state.lastCameraAt ?? Date.now()
    // A covered lens or closed physical shutter carries no information at all;
    // treat it as unavailable instead of concluding that nobody is here.
    if (typeof c.sceneEdge === 'number' && c.sceneEdge < 25) return 'unavailable'
    if (!c.face) {
      // No face: only count as "away" after a grace period, otherwise turning
      // the head for a moment would immediately mark the user as gone. The
      // grace also starts from the first frame, not from "never seen a face".
      const since = state.lastFaceAt ?? state.cameraStartedAt ?? now
      const absentFor = (now - since) / 1000
      return absentFor >= cfg.cameraAbsentSeconds ? 'away' : 'hold'
    }
    const distance = typeof c.distanceCm === 'number' ? c.distanceCm : null
    if (distance === null) return 'hold'
    if (distance >= cfg.sensorAwayDistanceCm) return 'away'
    if (distance <= cfg.sensorReturnDistanceCm) return 'present'
    return 'hold'
  }

  function evidenceSnapshot() {
    return {
      input: inputEvidence(),
      sensor: sensorEvidence(),
      camera: cameraEvidence(),
    }
  }

  // Keyboard and mouse share one idle clock, so "input" simply means the user
  // touched either device recently.
  function inputEvidence() {
    if (!cfg.inputEnabled) return 'disabled'
    if (state.input.idleSeconds === null) return 'unavailable'
    const idle = state.input.idleSeconds
    if (idle >= cfg.inputAwayIdleSeconds) return 'away'
    if (cfg.inputReturnIdleSeconds <= 0 && state.inputActive) return 'present'
    const returnWindow = Math.max(0.35, cfg.inputReturnIdleSeconds + 0.35)
    if (idle <= returnWindow) return 'present'
    return 'hold'
  }

  // Every checked source has to agree on the state; the boxes are ANDed.
  // Sources that are switched off or have no usable hardware are ignored, so a
  // missing IR sensor cannot freeze the decision. A source that is merely
  // unsure ("hold", e.g. the camera grace period) blocks the decision instead
  // of being ignored, so briefly turning away cannot flip the state.
  function evaluateRule(sources, evidence, target) {
    const usable = sources.filter((key) => {
      const value = evidence[key]
      return value !== 'disabled' && value !== 'unavailable'
    })
    if (usable.length === 0) return false
    return usable.every((key) => evidence[key] === target)
  }

  async function greetingSend(text, reason) {
    const sessionId = cfg.greetingSessionId
    if (!sessionId) {
      state.lastError = '未选择主动搭话会话'
      return { ok: false, error: state.lastError }
    }
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.prompt !== 'function') {
      state.lastError = 'sessionController 服务不可用'
      return { ok: false, error: state.lastError }
    }
    // A session whose working directory vanished can never accept a turn; report
    // that instead of firing a prompt that only fails inside the session.
    let cwd = null
    try {
      const list = await controller.list({}, AbortSignal.timeout(5000))
      const summary = (list?.items ?? []).find((item) => item.sessionId === sessionId)
      cwd = summary?.cwd ?? null
    } catch {
      // Listing is best-effort; the prompt below is the authoritative call.
    }
    if (cwd && !existsSync(cwd)) {
      state.lastError = `目标会话的工作区不存在：${cwd}`
      state.lastGreeting = { at: Date.now(), ok: false, reason, sessionId, error: state.lastError }
      return { ok: false, error: state.lastError }
    }
    const text_ = (text || (cfg.greetingText.trim() || defaultGreetingText()))
      .replaceAll('{away}', state.lastAwaySeconds > 0 ? formatDuration(state.lastAwaySeconds) : '一会儿')
      .replaceAll('{awaySeconds}', String(Math.round(state.lastAwaySeconds)))
    try {
      await controller.prompt(
        {
          requestId: randomUUID(),
          sessionId,
          mode: 'queue',
          content: [{ type: 'text', text: text_ }],
        },
        AbortSignal.timeout(30_000),
      )
      const record = { at: Date.now(), ok: true, reason, sessionId, text: text_ }
      state.lastGreeting = record
      state.lastError = null
      return { ok: true, record }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      state.lastError = message
      state.lastGreeting = { at: Date.now(), ok: false, reason, sessionId, error: message }
      log.warn?.(`[presence] greeting failed: ${message}`)
      return { ok: false, error: message }
    }
  }

  async function maybeGreet(awaySeconds) {
    // Detection keeps running when greetings are off; only the message is skipped.
    if (!cfg.greetingEnabled) return
    if (cfg.cooldownSeconds > 0 && state.lastGreeting?.at) {
      const since = Date.now() - state.lastGreeting.at
      if (since < cfg.cooldownSeconds * 1000) return
    }
    const template = cfg.greetingText.trim() || defaultGreetingText()
    const text = template
      .replaceAll('{away}', formatDuration(awaySeconds))
      .replaceAll('{awaySeconds}', String(Math.round(awaySeconds)))
    await greetingSend(text, 'return')
  }

  function tickEvaluation() {
    const evidence = evidenceSnapshot()
    state.evidence = evidence
    const away = evaluateRule(cfg.awaySources, evidence, 'away')
    const back = evaluateRule(cfg.returnSources, evidence, 'present')

    if (away) {
      if (state.presence !== 'away') {
        state.presence = 'away'
        state.awayStartedAt = state.lastTickAt ?? Date.now()
        state.lastAwaySeconds = 0
      } else if (state.lastTickAt && state.awayStartedAt !== null) {
        state.lastAwaySeconds = Math.max(0, (state.lastTickAt - state.awayStartedAt) / 1000)
      }
    } else if (back) {
      if (state.presence === 'away') {
        const awaySeconds = state.awayStartedAt && state.lastTickAt
          ? Math.max(0, (state.lastTickAt - state.awayStartedAt) / 1000)
          : state.lastAwaySeconds
        state.presence = 'present'
        state.awayStartedAt = null
        state.lastAwaySeconds = 0
        void maybeGreet(awaySeconds)
      } else {
        state.presence = 'present'
      }
    }
    state.updatedAt = Date.now()
  }

  function handleBridgeMessage(message) {
    if (!message || typeof message !== 'object') return
    if (message.type === 'hello' || message.type === 'sensor-info') {
      if (message.sensor && typeof message.sensor === 'object') {
        state.sensorInfo = {
          available: message.sensor.available === true,
          reason: message.sensor.reason ?? null,
          deviceId: message.sensor.deviceId ?? null,
          minMm: typeof message.sensor.minMm === 'number' ? message.sensor.minMm : null,
          maxMm: typeof message.sensor.maxMm === 'number' ? message.sensor.maxMm : null,
        }
      }
      if (message.type === 'hello') state.bridgePid = message.pid ?? null
      return
    }
    if (message.type !== 'tick') return
    if (state.bridgeError) state.bridgeError = null
    const now = typeof message.now === 'number' ? message.now : null
    state.lastTickAt = now
    const sensor = message.sensor && typeof message.sensor === 'object' ? message.sensor : {}
    state.sensorReading = {
      available: sensor.available === true,
      presence: typeof sensor.presence === 'string' ? sensor.presence : null,
      distanceMm: typeof sensor.distanceMm === 'number' ? sensor.distanceMm : null,
      error: sensor.error ?? null,
    }
    const input = message.input && typeof message.input === 'object' ? message.input : {}
    const lastInputAt = typeof input.lastInputAt === 'number' ? input.lastInputAt : null
    const idleMs = typeof input.idleMs === 'number' ? input.idleMs : null
    const previousInputAt = state.input.lastInputAt
    state.input = {
      idleSeconds:
        idleMs !== null
          ? Math.max(0, idleMs / 1000)
          : now !== null && lastInputAt !== null
            ? Math.max(0, (now - lastInputAt) / 1000)
            : null,
      lastInputAt,
    }
    // Polling can land up to one interval after the last keystroke, so a changed
    // lastInputAt is the reliable "something happened" signal for a zero-second
    // return threshold.
    state.inputActive = lastInputAt !== null && previousInputAt !== null && lastInputAt > previousInputAt
    tickEvaluation()
  }

  function handleCameraMessage(message) {
    if (!message || typeof message !== 'object') return
    if (message.type === 'camera-info') {
      state.cameraInfo = {
        available: message.available === true,
        reason: message.error ?? (message.available === true ? null : 'unavailable'),
        device: message.device ?? null,
        width: message.width ?? null,
        height: message.height ?? null,
      }
      if (message.available === true) {
        state.cameraError = null
        if (state.cameraStartedAt === null) state.cameraStartedAt = Date.now()
      }
      return
    }
    if (message.type !== 'camera') return
    const now = typeof message.now === 'number' ? message.now : Date.now()
    const face = message.face === true
    state.lastCameraAt = now
    if (face) state.lastFaceAt = now
    state.cameraReading = {
      available: true,
      face,
      distanceCm: typeof message.distanceCm === 'number' ? message.distanceCm : null,
      facePx: typeof message.facePx === 'number' ? message.facePx : null,
      sceneEdge: typeof message.sceneEdge === 'number' ? message.sceneEdge : null,
      error: message.error ?? null,
    }
    if (state.cameraError) state.cameraError = null
    tickEvaluation()
  }

  function resolvePython() {
    const candidates = []
    if (process.env.DSH_PYTHON) candidates.push(process.env.DSH_PYTHON)
    if (process.env.DSH_HOME) {
      candidates.push(join(process.env.DSH_HOME, 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'python', 'python.exe'))
    }
    // The bundled runtime is the one that actually has the wheels this bundle
    // installed; a global Python may be a different minor version (3.15 here)
    // and fail to import cp312 extensions.
    try {
      candidates.push(join(homedir(), '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'python', 'python.exe'))
    } catch {
      // homedir() can throw when USERPROFILE is missing.
    }
    for (const candidate of candidates) {
      if (candidate && existsSync(candidate)) return candidate
    }
    return 'python'
  }

  function startCamera() {
    if (disposed) return
    if (cfg.cameraEnabled !== true) {
      state.cameraInfo = { available: false, reason: 'disabled', device: null, width: null, height: null }
      return
    }
    if (process.platform !== 'win32') {
      state.cameraError = '当前系统不是 Windows，无法使用摄像头'
      return
    }
    if (!existsSync(CAMERA_PATH)) {
      state.cameraError = `camera.py 缺失: ${CAMERA_PATH}`
      return
    }
    cameraBuffer = ''
    state.cameraError = null
    const python = resolvePython()
    state.cameraPython = python
    const args = [
      CAMERA_PATH,
      '--interval-ms', String(Math.max(200, Math.round(cfg.pollIntervalMs))),
      '--face-width-cm', String(cfg.cameraFaceWidthCm),
      '--fov-deg', String(cfg.cameraFovDeg),
    ]
    if (cfg.cameraDevice) args.push('--device', cfg.cameraDevice)
    const env = { ...process.env, PYTHONPATH: [PYDEP_DIR, process.env.PYTHONPATH].filter(Boolean).join(';') }
    try {
      cameraChild = spawn(python, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env })
    } catch (error) {
      state.cameraError = error instanceof Error ? error.message : String(error)
      scheduleCameraRestart()
      return
    }
    cameraChild.stdout?.setEncoding('utf8')
    state.cameraPid = cameraChild.pid ?? null
    cameraChild.stdout?.on('data', (chunk) => {
      cameraBuffer += chunk
      let index
      while ((index = cameraBuffer.indexOf('\n')) >= 0) {
        const line = cameraBuffer.slice(0, index).trim()
        cameraBuffer = cameraBuffer.slice(index + 1)
        if (!line) continue
        try {
          handleCameraMessage(JSON.parse(line))
        } catch {
          // Ignore Python warnings that are not JSON.
        }
      }
    })
    cameraChild.stderr?.setEncoding('utf8')
    cameraChild.stderr?.on('data', (chunk) => {
      const text = String(chunk).trim()
      if (text) state.cameraError = text.slice(0, 400)
    })
    cameraChild.on('error', (error) => {
      // Most common case: no python on PATH and DSH_HOME did not resolve.
      state.cameraError = `摄像头助手启动失败：${error.message}`
      state.cameraPid = null
      cameraChild = null
    })
    cameraChild.on('exit', (code) => {
      cameraChild = null
      state.cameraPid = null
      if (disposed) return
      // Keep a Python traceback if one was reported; otherwise say it exited.
      if (!state.cameraError) state.cameraError = `摄像头助手退出 (code ${code ?? 'null'})`
      state.cameraInfo = { available: false, reason: 'exited', device: null, width: null, height: null }
      state.cameraReading = { available: false, face: false, distanceCm: null, facePx: null, sceneEdge: null, error: null }
      scheduleCameraRestart()
    })
  }

  function scheduleCameraRestart() {
    if (disposed) return
    if (cameraRestartTimer) return
    cameraRestartTimer = setTimeout(() => {
      cameraRestartTimer = null
      if (disposed) return
      state.cameraRestarts += 1
      startCamera()
    }, 5000)
  }

  function stopCamera() {
    if (cameraRestartTimer) {
      clearTimeout(cameraRestartTimer)
      cameraRestartTimer = null
    }
    if (cameraChild) {
      try { cameraChild.kill() } catch {}
      cameraChild = null
    }
    state.cameraPid = null
  }

  function startBridge() {
    if (disposed) return
    if (process.platform !== 'win32') {
      state.bridgeError = '当前系统不是 Windows，无法读取 Windows 传感器与鼠标状态'
      return
    }
    if (!existsSync(BRIDGE_PATH)) {
      state.bridgeError = `bridge.ps1 缺失: ${BRIDGE_PATH}`
      return
    }
    buffer = ''
    state.bridgeError = null
    const interval = Math.round(cfg.pollIntervalMs)
    try {
      child = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', BRIDGE_PATH, '-IntervalMs', String(interval)],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
      )
    } catch (error) {
      state.bridgeError = error instanceof Error ? error.message : String(error)
      scheduleRestart()
      return
    }
    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk) => {
      buffer += chunk
      let index
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).trim()
        buffer = buffer.slice(index + 1)
        if (!line) continue
        try {
          handleBridgeMessage(JSON.parse(line))
        } catch {
          // Ignore non-JSON noise from PowerShell.
        }
      }
    })
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', (chunk) => {
      const text = String(chunk).trim()
      if (text) state.bridgeError = text.slice(0, 400)
    })
    child.on('error', (error) => {
      state.bridgeError = error.message
    })
    child.on('exit', (code) => {
      child = null
      state.bridgePid = null
      if (disposed) return
      state.bridgeError = `bridge 退出 (code ${code ?? 'null'})`
      scheduleRestart()
    })
  }

  function scheduleRestart() {
    if (disposed) return
    if (restartTimer) return
    restartTimer = setTimeout(() => {
      restartTimer = null
      if (disposed) return
      state.bridgeRestarts += 1
      startBridge()
    }, 3000)
  }

  function stopBridge() {
    if (restartTimer) {
      clearTimeout(restartTimer)
      restartTimer = null
    }
    if (child) {
      try { child.kill() } catch {}
      child = null
    }
    state.bridgePid = null
  }

  // ── HTTP API for the settings page ───────────────────────────────────────
  function installRoutes() {
    if (!webServer || typeof webServer.register !== 'function') {
      state.lastError = 'webServer 服务不可用，设置页无法加载'
      return () => {}
    }
    const handler = async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const route = url.pathname.slice(ROUTE_PREFIX.length).replace(/^\/+/, '')
      if (req.method === 'GET' && route === 'state') {
        sendJson(res, 200, {
          ok: true,
          config: cfg,
          presence: state.presence,
          evidence: state.evidence,
          awaySeconds: state.awayStartedAt && state.lastTickAt
            ? Math.max(0, (state.lastTickAt - state.awayStartedAt) / 1000)
            : state.lastAwaySeconds,
          sensor: { info: state.sensorInfo, reading: state.sensorReading },
          camera: {
            info: state.cameraInfo,
            reading: state.cameraReading,
            pid: state.cameraPid,
            python: state.cameraPython,
            error: state.cameraError,
            restarts: state.cameraRestarts,
            lastFrameAt: state.lastCameraAt,
            lastFaceAt: state.lastFaceAt,
          },
          input: state.input,
          bridge: {
            pid: state.bridgePid,
            error: state.bridgeError,
            restarts: state.bridgeRestarts,
            lastTickAt: state.lastTickAt,
          },
          lastGreeting: state.lastGreeting,
          lastError: state.lastError,
          now: Date.now(),
        })
        return
      }
      if (req.method === 'GET' && route === 'sessions') {
        const controller = ctx.get('sessionController')
        if (!controller || typeof controller.list !== 'function') {
          sendJson(res, 503, { ok: false, error: 'sessionController 服务不可用' })
          return
        }
        try {
          const result = await controller.list({}, AbortSignal.timeout(10_000))
          const titles = ctx.get('sessionTitle')
          const store = ctx.get('sessions')
          const items = (result?.items ?? []).map((item) => {
            // The session list carries the projected title for most sessions;
            // live sessions can be asked directly as a fallback.
            let name = null
            const projected = item?.projections?.values?.title
            if (typeof projected === 'string' && projected.trim()) name = projected.trim()
            if (!name && titles?.get && store?.get) {
              try {
                const session = store.get(item.sessionId)
                const snapshot = session ? titles.get(session) : null
                const value =
                  typeof snapshot === 'string' ? snapshot : snapshot?.title ?? snapshot?.value ?? null
                if (typeof value === 'string' && value.trim()) name = value.trim()
              } catch {}
            }
            return {
              sessionId: item.sessionId,
              name,
              cwd: item.cwd ?? null,
              updatedAt: item.updatedAt ?? null,
              running: item.running === true,
              blank: item.blank === true,
              agentAvailable: item.agentAvailable === true,
            }
          })
          let workspaces = []
          try {
            const registry = ctx.get('workspaceRegistry')
            const list = registry?.list?.() ?? []
            workspaces = list.map((ws) => ({ path: ws.path ?? ws.directory ?? null, title: ws.title ?? ws.name ?? null }))
          } catch {}
          sendJson(res, 200, { ok: true, sessions: items, workspaces })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
        return
      }
      if (req.method === 'POST' && route === 'config') {
        let body
        try {
          body = await readJsonBody(req)
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
          return
        }
        const incoming = body && typeof body.config === 'object' ? body.config : {}
        const sanitized = normalizeConfig({ ...cfg, ...incoming })
        const patch = {}
        for (const key of Object.keys(DEFAULTS)) {
          if (Object.prototype.hasOwnProperty.call(incoming, key)) patch[key] = sanitized[key]
        }
        const editor = ctx.get('configEditor')
        const entry = ctx.fiber?.entry
        if (!editor || typeof editor.edit !== 'function' || !entry) {
          sendJson(res, 503, { ok: false, error: 'configEditor 不可用，无法保存配置' })
          return
        }
        // Send the response before the edit restarts the plugin fiber.
        sendJson(res, 200, { ok: true, applying: true, patch })
        try {
          await editor.edit(entry, (current) => ({ ...(current ?? {}), ...patch }))
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          state.lastError = `保存配置失败：${message}`
          log.warn?.(`[presence] config save failed: ${message}`)
        }
        return
      }
      if (req.method === 'POST' && route === 'test-greeting') {
        const result = await greetingSend(undefined, 'test')
        sendJson(res, result.ok ? 200 : 500, result)
        return
      }
      sendJson(res, 404, { ok: false, error: 'not found' })
    }
    try {
      return webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler })
    } catch (error) {
      state.lastError = `路由注册失败: ${error instanceof Error ? error.message : String(error)}`
      return () => {}
    }
  }

  ctx.effect(() => {
    const disposeRoutes = installRoutes()
    startBridge()
    startCamera()
    const heartbeat = setInterval(() => {
      state.updatedAt = Date.now()
      if (!state.bridgePid && !state.bridgeError) state.bridgeError = 'bridge 未运行'
      if (state.bridgePid && state.lastTickAt && Date.now() - state.lastTickAt > 15000) {
        state.bridgeError = 'bridge 超过 15 秒没有上报数据（可能被系统阻止）'
      }
      // The camera helper only needs to be fresh while it is enabled; a stalled
      // frame stream would otherwise silently freeze the presence estimate.
      if (cfg.cameraEnabled && state.cameraPid && state.lastCameraAt && Date.now() - state.lastCameraAt > 15000) {
        state.cameraError = '摄像头超过 15 秒没有上报画面（可能被占用或已断开）'
      }
      if (state.presence === 'away' && state.awayStartedAt && state.lastTickAt) {
        state.lastAwaySeconds = Math.max(0, (state.lastTickAt - state.awayStartedAt) / 1000)
      }
    }, 5000)
    return () => {
      disposed = true
      clearInterval(heartbeat)
      stopBridge()
      stopCamera()
      disposeRoutes()
    }
  }, 'presence: runtime')
}
