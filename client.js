window.__ModuleLoader__.load({
  id: '@local/dsh-presence-greeting',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'dsh-presence-greeting'

    const zh = {
      nav: '在线状态',
      title: '在线状态与主动搭话',
      subtitle: '组合红外传感器、摄像头和鼠标判断你是否在电脑前，回来时到指定会话打一声招呼。',

      statusTitle: '当前状态',
      presenceLabel: '判定结果',
      presencePresent: '在线',
      presenceAway: '离开',
      presenceUnknown: '未知',
      presenceAwayFor: '已离开 {time}',
      evidenceLabel: '各来源证据',
      evidenceAway: '离开',
      evidencePresent: '在线',
      evidenceHold: '不确定',
      evidenceDisabled: '已停用',
      evidenceUnavailable: '不可用',
      ruleLabelLine: '规则：{away} / {return}',

      sensorLabel: '红外传感器',
      sensorAvailable: '可用',
      sensorUnavailable: '不可用',
      sensorDistance: '距离 {cm} 厘米',
      sensorPresencePresent: '检测到人体',
      sensorPresenceAbsent: '未检测到人体',
      sensorReason: '原因：{reason}',

      cameraLabel: '摄像头',
      cameraAvailable: '可用',
      cameraUnavailable: '不可用',
      cameraCovered: '画面被遮挡或没有细节',
      cameraFace: '检测到人脸',
      cameraNoFace: '未检测到人脸',
      cameraDistance: '估算距离 {cm} 厘米',
      cameraUnavailableHint: '摄像头不可用时不会参与判定，请检查设备与 pydeps 依赖。',

      mouseLabel: '键鼠',
      mouseIdle: '键鼠已静止 {time}',
      mouseMoved: '位置 ({x}, {y})',

      bridgeLabel: '传感器桥接',
      bridgeRunning: '运行中（PID {pid}）',
      bridgeStopped: '未运行',
      bridgeRestarts: '重启次数 {n}',
      lastTick: '最近采样：{time}',

      formTitle: '检测设置',
      sensorEnabled: '启用红外传感器',
      sensorEnabledHint: '通过 Windows.Devices.Sensors.HumanPresenceSensor 读取人体存在与距离。',
      mouseEnabled: '检测键鼠使用情况',
      mouseEnabledHint: '读取系统空闲时间；键盘或鼠标任一有操作都会重置计时。',
      cameraEnabled: '启用摄像头',
      cameraEnabledHint: '用摄像头画面检测人脸，并按人脸宽度估算距离；适合没有红外传感器的机器。',
      sensorAwayDistance: '判定“离开”的距离（厘米）',
      sensorAwayDistanceHint: '距离大于该值视为离开，默认 200 厘米；摄像头来源也使用这一阈值。',
      sensorReturnDistance: '判定“回来”的距离（厘米）',
      sensorReturnDistanceHint: '距离小于该值视为回来，默认 100 厘米。',
      mouseAwayIdle: '判定“离开”的无操作时间（秒）',
      mouseAwayIdleHint: '键盘和鼠标都没有操作超过该时间视为离开，默认 600 秒。',
      mouseReturnIdle: '判定“回来”的无操作时间（秒）',
      mouseReturnIdleHint: '可设为 0：键盘或鼠标一动就判定回来。',
      cameraDevice: '摄像头索引',
      cameraDeviceHint: '留空自动选择；多摄像头时填 0、1、2 等索引。',
      cameraFaceWidth: '人脸宽度（厘米）',
      cameraFaceWidthHint: '成人脸宽约 14 厘米，用于距离估算；估算偏近就调小。',
      cameraFov: '镜头视场角（度）',
      cameraFovHint: '普通笔记本摄像头约 60 度；估算偏远就调小。',
      cameraAbsent: '无人脸多久判定离开（秒）',
      cameraAbsentHint: '画面中持续没有检测到人脸超过该时间才判定离开，避免转头误判，默认 12 秒。',
      awayRule: '判定离开的方式',
      awayRuleHint: '展开勾选；全部勾选项同时符合才判定为离开。已停用或缺少硬件的项会自动忽略。',
      returnRule: '判定回来的方式',
      returnRuleHint: '展开勾选；全部勾选项同时符合才判定为回来。已停用或缺少硬件的项会自动忽略。',
      sourceMouse: '键鼠',
      sourceSensor: '传感器',
      sourceCamera: '摄像头',
      ruleNone: '未勾选任何来源（不会判定）',

      greetingTitle: '主动搭话',
      greetingEnabled: '启用主动搭话',
      greetingEnabledHint: '关闭后仍然检测在线状态，只是判定回来时不会自动发消息。',
      greetingSession: '使用的会话',
      greetingSessionHint: '从当前工作区的会话中选择；判定回来时在该会话里发送下面这句话。',
      greetingSessionEmpty: '（未选择）',
      greetingSessionLoad: '刷新会话列表',
      greetingText: '问候语',
      greetingTextHint: '发送到会话的文本，可用 {away} 表示离开时长；留空则发送默认问候语。',
      cooldown: '问候冷却（秒）',
      cooldownHint: '两次自动问候之间的最小间隔，默认 120 秒。',
      pollInterval: '采样间隔（毫秒）',
      pollIntervalHint: '读取传感器、键鼠与摄像头的间隔，默认 500 毫秒。',
      save: '保存设置',
      saving: '保存中…',
      saved: '已保存，设置正在应用。',
      saveFailed: '保存失败：{msg}',
      testGreeting: '试发一次问候',
      testSent: '测试问候已发送。',
      testFailed: '发送失败：{msg}',
      refresh: '刷新状态',
      loadFailed: '加载状态失败：{msg}',
      otherSessions: '其他会话',
      enabled: '启用',
      disabled: '停用',
      lastGreeting: '上次问候：{time}',
      neverGreeted: '还没有发送过问候',
      greetingFailed: '上次问候失败：{msg}',
      testHint: '“试发一次问候”会立即向所选会话发送一条消息，用于验证链路。',
    }

    const en = {
      nav: 'Presence',
      title: 'Presence and proactive greeting',
      subtitle: 'Combine an infrared sensor, a camera, and the mouse to tell whether you are at the computer, then greet you in a chosen session when you return.',

      statusTitle: 'Current state',
      presenceLabel: 'Verdict',
      presencePresent: 'Present',
      presenceAway: 'Away',
      presenceUnknown: 'Unknown',
      presenceAwayFor: 'Away for {time}',
      evidenceLabel: 'Per-source evidence',
      evidenceAway: 'Away',
      evidencePresent: 'Present',
      evidenceHold: 'Unsure',
      evidenceDisabled: 'Disabled',
      evidenceUnavailable: 'Unavailable',
      ruleLabelLine: 'Rules: {away} / {return}',

      sensorLabel: 'Infrared sensor',
      sensorAvailable: 'Available',
      sensorUnavailable: 'Unavailable',
      sensorDistance: '{cm} cm away',
      sensorPresencePresent: 'Person detected',
      sensorPresenceAbsent: 'No person detected',
      sensorReason: 'Reason: {reason}',

      cameraLabel: 'Camera',
      cameraAvailable: 'Available',
      cameraUnavailable: 'Unavailable',
      cameraCovered: 'View is covered or has no detail',
      cameraFace: 'Face detected',
      cameraNoFace: 'No face',
      cameraDistance: 'Estimated {cm} cm away',
      cameraUnavailableHint: 'An unavailable camera is ignored; check the device and the pydeps dependencies.',

      mouseLabel: 'Input',
      mouseIdle: 'Idle for {time}',
      mouseMoved: 'at ({x}, {y})',

      bridgeLabel: 'Sensor bridge',
      bridgeRunning: 'Running (PID {pid})',
      bridgeStopped: 'Stopped',
      bridgeRestarts: 'Restarts: {n}',
      lastTick: 'Last sample: {time}',

      formTitle: 'Detection',
      sensorEnabled: 'Enable infrared sensor',
      sensorEnabledHint: 'Reads presence and distance through Windows.Devices.Sensors.HumanPresenceSensor.',
      mouseEnabled: 'Detect keyboard and mouse activity',
      mouseEnabledHint: 'Reads the system idle time; any keyboard or mouse activity resets it.',
      cameraEnabled: 'Enable camera',
      cameraEnabledHint: 'Detects a face in the camera image and estimates distance from its width; useful on machines without an IR sensor.',
      sensorAwayDistance: 'Away distance (cm)',
      sensorAwayDistanceHint: 'Farther than this counts as away. Default: 200 cm. The camera source uses the same threshold.',
      sensorReturnDistance: 'Return distance (cm)',
      sensorReturnDistanceHint: 'Closer than this counts as present. Default: 100 cm.',
      mouseAwayIdle: 'Away idle time (s)',
      mouseAwayIdleHint: 'No keyboard or mouse activity for this long counts as away. Default: 600 s.',
      mouseReturnIdle: 'Return idle time (s)',
      mouseReturnIdleHint: 'Set 0 to count any keyboard or mouse activity as a return.',
      cameraDevice: 'Camera index',
      cameraDeviceHint: 'Leave empty to auto-select; with several cameras use 0, 1, 2 and so on.',
      cameraFaceWidth: 'Face width (cm)',
      cameraFaceWidthHint: 'An adult face is about 14 cm wide; lower it if estimates come out too close.',
      cameraFov: 'Field of view (deg)',
      cameraFovHint: 'A typical laptop camera is about 60 degrees; lower it if estimates come out too far.',
      cameraAbsent: 'No-face grace (s)',
      cameraAbsentHint: 'Away only after no face is seen for this long, so glancing away does not count. Default: 12 s.',
      awayRule: 'Away rule',
      awayRuleHint: 'Expand and tick sources; every ticked source must agree before the state becomes away. Disabled or missing sources are ignored.',
      returnRule: 'Return rule',
      returnRuleHint: 'Expand and tick sources; every ticked source must agree before the state becomes present. Disabled or missing sources are ignored.',
      sourceMouse: 'Input',
      sourceSensor: 'Sensor',
      sourceCamera: 'Camera',
      ruleNone: 'Nothing ticked (never matches)',

      greetingTitle: 'Proactive greeting',
      greetingEnabled: 'Enable proactive greeting',
      greetingEnabledHint: 'With this off the presence state is still tracked, but returning sends no message.',
      greetingSession: 'Session',
      greetingSessionHint: 'Pick a session from the current workspace; on return this text is sent there.',
      greetingSessionEmpty: '(none)',
      greetingSessionLoad: 'Refresh sessions',
      greetingText: 'Greeting text',
      greetingTextHint: 'Text sent to the session; {away} is replaced with the away duration. Leave empty for the default.',
      cooldown: 'Greeting cooldown (s)',
      cooldownHint: 'Minimum interval between automatic greetings. Default: 120 s.',
      pollInterval: 'Sampling interval (ms)',
      pollIntervalHint: 'How often the sensor, input and camera are read. Default: 500 ms.',
      save: 'Save settings',
      saving: 'Saving…',
      saved: 'Saved. Settings are being applied.',
      saveFailed: 'Save failed: {msg}',
      testGreeting: 'Send a test greeting',
      testSent: 'Test greeting sent.',
      testFailed: 'Send failed: {msg}',
      refresh: 'Refresh state',
      loadFailed: 'Could not load state: {msg}',
      otherSessions: 'Other sessions',
      enabled: 'On',
      disabled: 'Off',
      lastGreeting: 'Last greeting: {time}',
      neverGreeted: 'No greeting sent yet',
      greetingFailed: 'Last greeting failed: {msg}',
      testHint: 'The test button sends a message to the selected session right away to verify the path.',
    }

    const css = `
.pg-root{display:flex;flex-direction:column;gap:14px;font-size:12.5px;color:var(--dsw-alias-label-primary)}
.pg-title{margin:0;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}
.pg-subtitle{margin:2px 0 0;font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.pg-card{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px 12px 14px;background:var(--dsw-alias-bg-layer-1,#fff)}
.pg-card-title{margin:0 0 4px;font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.pg-status-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:4px 0}
.pg-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;font-size:11.5px;line-height:1.6;background:var(--dsw-alias-bg-layer-2,#f7f7f8);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.pg-badge.present{color:var(--dsw-alias-success,#1a7f37);border-color:currentColor}
.pg-badge.away{color:var(--dsw-alias-danger,#d93025);border-color:currentColor}
.pg-badge.unknown{color:var(--dsw-alias-label-tertiary)}
.pg-badge.off{opacity:.6}
.pg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:6px}
.pg-stat{padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2,#f7f7f8);min-width:0}
.pg-stat-name{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.pg-stat-value{font-size:12.5px;line-height:1.5;margin-top:2px;word-break:break-word}
.pg-hint{font-size:11px;line-height:1.55;color:var(--dsw-alias-label-tertiary)}
.pg-warnbox{margin:10px 0 0;padding:8px 10px;border-radius:8px;font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2,#f7f7f8);border:1px solid var(--dsw-alias-border-l2)}
.pg-subgroup{margin-left:10px;padding-left:10px;border-left:2px solid var(--dsw-alias-border-l2)}
.pg-field{display:flex;flex-direction:column;gap:5px;padding:9px 0;border-top:1px solid var(--dsw-alias-border-l2)}
.pg-field:first-of-type{border-top:none}
.pg-field-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pg-field-label{font-size:12.5px;color:var(--dsw-alias-label-primary)}
.pg-field-body{display:flex;align-items:center;gap:8px}
.pg-input,.pg-select{font:inherit;font-size:12.5px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:5px 8px;box-sizing:border-box}
.pg-input{width:110px}
.pg-input:focus,.pg-select:focus{outline:1px solid var(--dsw-alias-brand,#6e56cf);outline-offset:1px}
.pg-select{min-width:190px;max-width:100%}
.pg-details{min-width:190px;max-width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:2px 10px;background:var(--dsw-alias-bg-layer-1,#fff)}
.pg-summary{cursor:pointer;font-size:12.5px;line-height:1.9;color:var(--dsw-alias-label-primary)}
.pg-checks{display:flex;flex-direction:column;gap:5px;padding:4px 0 8px}
.pg-check{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--dsw-alias-label-primary);cursor:pointer}
.pg-checkbox{width:14px;height:14px;margin:0;accent-color:var(--dsw-alias-brand,#6e56cf)}
.pg-session-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pg-session-row .pg-select{flex:1 1 240px}
.pg-unit{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.pg-switch{position:relative;width:34px;height:19px;border-radius:10px;border:none;cursor:pointer;padding:0;flex:0 0 auto;background:var(--dsw-alias-border-l2);transition:background .15s}
.pg-switch[aria-checked="true"]{background:var(--dsw-alias-brand,#6e56cf)}
.pg-switch span{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;transition:transform .15s;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.pg-switch[aria-checked="true"] span{transform:translateX(15px)}
.pg-textarea{width:100%;min-height:64px;resize:vertical;font:inherit;font-size:12.5px;line-height:1.5;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:7px 9px;box-sizing:border-box}
.pg-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:4px}
.pg-btn{font:inherit;font-size:12px;line-height:1;border-radius:7px;padding:7px 12px;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary)}
.pg-btn:hover{background:var(--dsw-alias-interactive-bg-hover,#f0f0f2)}
.pg-btn:disabled{opacity:.55;cursor:default}
.pg-btn-primary{border-color:transparent;background:var(--dsw-alias-brand,#6e56cf);color:#fff}
.pg-btn-primary:hover{filter:brightness(1.05)}
.pg-notice{font-size:12px;line-height:1.5}
.pg-notice.ok{color:var(--dsw-alias-success,#28a745)}
.pg-notice.error{color:var(--dsw-alias-danger,#d93025)}
.pg-notice.info{color:var(--dsw-alias-label-tertiary)}
`

    const styleId = 'dsh-presence-greeting/settings.css'

    function ensureStyles() {
      if (typeof document === 'undefined') return () => {}
      const existing = document.querySelector('style[data-plugin-css="' + styleId + '"]')
      if (existing) return () => {}
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-presence-greeting'
      tag.dataset.pluginCss = styleId
      tag.textContent = css
      document.head.appendChild(tag)
      return () => {
        try { tag.remove() } catch {}
      }
    }

    function fmt(seconds) {
      const s = Math.max(0, Math.round(seconds ?? 0))
      if (s < 60) return s + 's'
      const m = Math.floor(s / 60)
      if (m < 60) return m + 'm'
      const hours = Math.floor(m / 60)
      const mins = m % 60
      return mins > 0 ? hours + 'h ' + mins + 'm' : hours + 'h'
    }

    function shortId(id) {
      const text = String(id || '')
      const tail = text.split('-').pop() || text
      return tail.slice(0, 6)
    }

    function baseName(path) {
      if (!path) return ''
      const parts = String(path).split(/[\\/]/).filter(Boolean)
      return parts[parts.length - 1] || String(path)
    }

    function Switch(props) {
      return h('button', {
        type: 'button',
        role: 'switch',
        className: 'pg-switch',
        'aria-checked': props.checked ? 'true' : 'false',
        'aria-label': props.label,
        disabled: props.disabled,
        onClick: () => props.onChange(!props.checked),
      }, h('span', null))
    }

    function Field(props) {
      return h('div', { className: 'pg-field' },
        h('div', { className: 'pg-field-head' },
          h('div', { className: 'pg-field-label' }, props.label),
          props.switch ? Switch({
            checked: props.switch.checked,
            label: props.label,
            onChange: props.switch.onChange,
          }) : null,
        ),
        props.hint ? h('div', { className: 'pg-hint' }, props.hint) : null,
        props.children ? h('div', { className: 'pg-field-body' }, props.children) : null,
      )
    }

    const SOURCE_ITEMS = [
      { key: 'input', labelKey: 'sourceMouse' },
      { key: 'sensor', labelKey: 'sourceSensor' },
      { key: 'camera', labelKey: 'sourceCamera' },
    ]

    // The two rule settings are AND lists: every ticked source must agree.
    function SourceChecklist(props) {
      const t = props.t
      const selected = Array.isArray(props.value) ? props.value : []
      const names = SOURCE_ITEMS.filter((item) => selected.includes(item.key)).map((item) => t(item.labelKey))
      return h('details', { className: 'pg-details' },
        h('summary', { className: 'pg-summary', 'aria-label': props.label },
          names.length ? names.join(' + ') : t('ruleNone'),
        ),
        h('div', { className: 'pg-checks' }, SOURCE_ITEMS.map((item) =>
          h('label', { className: 'pg-check', key: item.key },
            h('input', {
              type: 'checkbox',
              className: 'pg-checkbox',
              checked: selected.includes(item.key),
              onChange: (event) => {
                const next = new Set(selected)
                if (event.target.checked) next.add(item.key)
                else next.delete(item.key)
                props.onChange(SOURCE_ITEMS.filter((entry) => next.has(entry.key)).map((entry) => entry.key))
              },
            }),
            h('span', null, t(item.labelKey)),
          ),
        )),
      )
    }

    function evidenceText(t, value) {
      if (value === 'away') return t('evidenceAway')
      if (value === 'present') return t('evidencePresent')
      if (value === 'hold') return t('evidenceHold')
      if (value === 'disabled') return t('evidenceDisabled')
      return t('evidenceUnavailable')
    }

    function StatusCard(props) {
      const { t, snap } = props
      if (!snap) return null
      const presence = snap.presence || 'unknown'
      const presenceClass = presence === 'present' ? 'present' : presence === 'away' ? 'away' : 'unknown'
      const presenceText = presence === 'present' ? t('presencePresent') : presence === 'away' ? t('presenceAway') : t('presenceUnknown')
      const evidence = snap.evidence || {}
      const config = snap.config || {}
      const awayText = presence === 'away' && snap.awaySeconds > 0 ? ' · ' + t('presenceAwayFor').replace('{time}', fmt(snap.awaySeconds)) : ''

      const sensor = snap.sensor || {}
      const sensorReading = sensor.reading || {}
      const sensorInfo = sensor.info || {}
      const camera = snap.camera || {}
      const cameraInfo = camera.info || {}
      const cameraReading = camera.reading || {}
      const input = snap.input || {}
      const bridge = snap.bridge || {}

      const sourceSummary = (list) => (Array.isArray(list) && list.length)
        ? list.map((key) => t(key === 'input' ? 'sourceMouse' : key === 'sensor' ? 'sourceSensor' : 'sourceCamera')).join(' + ')
        : t('ruleNone')

      return h('section', { className: 'pg-card' },
        h('h3', { className: 'pg-card-title' }, t('statusTitle')),
        h('div', { className: 'pg-status-row' },
          h('span', null, t('presenceLabel') + '：'),
          h('span', { className: 'pg-badge ' + presenceClass }, presenceText + awayText),
        ),
        h('div', { className: 'pg-hint' },
          t('ruleLabelLine')
            .replace('{away}', sourceSummary(config.awaySources))
            .replace('{return}', sourceSummary(config.returnSources)),
        ),
        h('div', { className: 'pg-grid' },
          h('div', { className: 'pg-stat' },
            h('div', { className: 'pg-stat-name' }, t('sensorLabel')),
            h('div', { className: 'pg-stat-value' },
              config.sensorEnabled === false
                ? t('disabled')
                : sensorInfo.available
                  ? t('sensorAvailable') + ' · ' + evidenceText(t, evidence.sensor)
                  : t('sensorUnavailable') + ' · ' + evidenceText(t, evidence.sensor),
              typeof sensorReading.distanceMm === 'number'
                ? h('div', { className: 'pg-hint' }, t('sensorDistance').replace('{cm}', String(Math.round(sensorReading.distanceMm / 10))))
                : null,
            ),
          ),
          h('div', { className: 'pg-stat' },
            h('div', { className: 'pg-stat-name' }, t('cameraLabel')),
            h('div', { className: 'pg-stat-value' },
              config.cameraEnabled !== true
                ? t('disabled')
                : cameraInfo.available
                  ? t('cameraAvailable') + ' · ' + evidenceText(t, evidence.camera)
                  : t('cameraUnavailable') + ' · ' + evidenceText(t, evidence.camera),
              cameraReading.face
                ? h('div', { className: 'pg-hint' },
                    t('cameraFace') +
                    (typeof cameraReading.distanceCm === 'number'
                      ? ' · ' + t('cameraDistance').replace('{cm}', String(Math.round(cameraReading.distanceCm)))
                      : ''))
                : cameraInfo.available
                  ? h('div', { className: 'pg-hint' },
                      typeof cameraReading.sceneEdge === 'number' && cameraReading.sceneEdge < 25
                        ? t('cameraCovered')
                        : t('cameraNoFace'))
                  : null,
            ),
          ),
          h('div', { className: 'pg-stat' },
            h('div', { className: 'pg-stat-name' }, t('mouseLabel')),
            h('div', { className: 'pg-stat-value' },
              config.inputEnabled === false
                ? t('disabled')
                : evidenceText(t, evidence.input),
              typeof input.idleSeconds === 'number'
                ? h('div', { className: 'pg-hint' }, t('mouseIdle').replace('{time}', fmt(input.idleSeconds)))
                : null,
            ),
          ),
          h('div', { className: 'pg-stat' },
            h('div', { className: 'pg-stat-name' }, t('bridgeLabel')),
            h('div', { className: 'pg-stat-value' },
              bridge.pid ? t('bridgeRunning').replace('{pid}', String(bridge.pid)) : t('bridgeStopped'),
              bridge.restarts ? h('div', { className: 'pg-hint' }, t('bridgeRestarts').replace('{n}', String(bridge.restarts))) : null,
            ),
          ),
        ),
        config.cameraEnabled === true && cameraInfo.available === true && typeof cameraReading.sceneEdge === 'number' && cameraReading.sceneEdge < 25
          ? h('div', { className: 'pg-warnbox' }, t('cameraUnavailableHint'))
          : null,
        snap.lastError ? h('div', { className: 'pg-warnbox' }, snap.lastError) : null,
      )
    }

    function Section(props) {
      const t = props.t
      const [snap, setSnap] = React.useState(null)
      const [draft, setDraft] = React.useState(null)
      const [sessions, setSessions] = React.useState(null)
      const [sessionError, setSessionError] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [testing, setTesting] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const loadedRef = React.useRef(false)

      const loadState = React.useCallback(async (initial) => {
        try {
          const response = await fetch('/dsh-presence-greeting/state', { cache: 'no-store' })
          const data = await response.json()
          setSnap(data)
          if (data && data.config && (initial || !loadedRef.current)) {
            setDraft(data.config)
            loadedRef.current = true
          }
        } catch (error) {
          setNotice({ kind: 'error', text: t('loadFailed').replace('{msg}', error && error.message ? error.message : String(error)) })
        }
      }, [t])

      const loadSessions = React.useCallback(async () => {
        setSessionError(null)
        try {
          const response = await fetch('/dsh-presence-greeting/sessions', { cache: 'no-store' })
          const data = await response.json()
          if (!data || data.ok !== true) throw new Error((data && data.error) || 'unknown error')
          setSessions({ items: data.sessions || [], workspaces: data.workspaces || [] })
        } catch (error) {
          setSessionError(error && error.message ? error.message : String(error))
        }
      }, [])

      React.useEffect(() => {
        let alive = true
        void loadState(true)
        void loadSessions()
        const timer = setInterval(() => { if (alive) void loadState(false) }, 2000)
        return () => {
          alive = false
          clearInterval(timer)
        }
      }, [loadState, loadSessions])

      if (!draft) {
        return h('div', { className: 'pg-root' },
          h('h2', { className: 'pg-title' }, t('title')),
          h('p', { className: 'pg-subtitle' }, t('subtitle')),
          notice ? h('div', { className: 'pg-notice ' + (notice.kind || 'info') }, notice.text) : null,
        )
      }

      const cfg = draft
      const update = (key) => (value) => {
        setDraft((current) => ({ ...(current || {}), [key]: value }))
      }

      async function save() {
        setSaving(true)
        setNotice(null)
        try {
          const response = await fetch('/dsh-presence-greeting/config', {
            method: 'POST',
            headers: { 'content-type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ config: draft }),
          })
          const data = await response.json()
          if (!data || data.ok !== true) throw new Error((data && data.error) || 'unknown error')
          setNotice({ kind: 'ok', text: t('saved') })
        } catch (error) {
          const message = error && error.message ? error.message : String(error)
          setNotice({ kind: 'error', text: t('saveFailed').replace('{msg}', message) })
        } finally {
          setSaving(false)
        }
      }

      async function test() {
        setTesting(true)
        setNotice(null)
        try {
          const response = await fetch('/dsh-presence-greeting/test-greeting', { method: 'POST' })
          const data = await response.json()
          if (!data || data.ok !== true) throw new Error((data && data.error) || 'unknown error')
          setNotice({ kind: 'ok', text: t('testSent') })
        } catch (error) {
          const message = error && error.message ? error.message : String(error)
          setNotice({ kind: 'error', text: t('testFailed').replace('{msg}', message) })
        } finally {
          setTesting(false)
        }
      }

      const items = sessions ? sessions.items : []
      const savedId = cfg.greetingSessionId || ''
      const savedExists = items.some((item) => item.sessionId === savedId)
      const groups = new Map()
      for (const item of items) {
        const key = item.cwd || ''
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(item)
      }
      const workspaceTitles = new Map()
      for (const ws of (sessions ? sessions.workspaces : [])) {
        if (ws && ws.path) workspaceTitles.set(ws.path, ws.title || baseName(ws.path))
      }
      const grouped = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))

      const optionLabel = (item, insideGroup) => {
        const parts = []
        parts.push(item.name || shortId(item.sessionId))
        if (!insideGroup) parts.push(baseName(item.cwd) || t('otherSessions'))
        if (item.running) parts.push('▶')
        return parts.join(' · ')
      }

      return h('div', { className: 'pg-root' },
        h('div', null,
          h('h2', { className: 'pg-title' }, t('title')),
          h('p', { className: 'pg-subtitle' }, t('subtitle')),
        ),

        StatusCard({ t, snap }),

        h('section', { className: 'pg-card' },
          h('h3', { className: 'pg-card-title' }, t('formTitle')),

          Field({
            label: t('sensorEnabled'),
            hint: t('sensorEnabledHint'),
            switch: {
              checked: cfg.sensorEnabled !== false,
              onChange: (value) => update('sensorEnabled')(value),
            },
          }),
          cfg.sensorEnabled !== false
            ? h('div', { className: 'pg-subgroup' },
                Field({
                  label: t('sensorAwayDistance'),
                  hint: t('sensorAwayDistanceHint'),
                  children: h('input', {
                    className: 'pg-input', type: 'number', min: 10, max: 2000, step: 10,
                    value: cfg.sensorAwayDistanceCm ?? 200, 'aria-label': t('sensorAwayDistance'),
                    onChange: (event) => update('sensorAwayDistanceCm')(Number(event.target.value)),
                  }),
                }),
                Field({
                  label: t('sensorReturnDistance'),
                  hint: t('sensorReturnDistanceHint'),
                  children: h('input', {
                    className: 'pg-input', type: 'number', min: 1, max: 2000, step: 10,
                    value: cfg.sensorReturnDistanceCm ?? 100, 'aria-label': t('sensorReturnDistance'),
                    onChange: (event) => update('sensorReturnDistanceCm')(Number(event.target.value)),
                  }),
                }),
              )
            : null,

          Field({
            label: t('mouseEnabled'),
            hint: t('mouseEnabledHint'),
            switch: {
              checked: cfg.inputEnabled !== false,
              onChange: (value) => update('inputEnabled')(value),
            },
          }),
          cfg.inputEnabled !== false
            ? h('div', { className: 'pg-subgroup' },
                Field({
                  label: t('mouseAwayIdle'),
                  hint: t('mouseAwayIdleHint'),
                  children: h('input', {
                    className: 'pg-input', type: 'number', min: 1, max: 86400, step: 30,
                    value: cfg.inputAwayIdleSeconds ?? 600, 'aria-label': t('mouseAwayIdle'),
                    onChange: (event) => update('inputAwayIdleSeconds')(Number(event.target.value)),
                  }),
                }),
                Field({
                  label: t('mouseReturnIdle'),
                  hint: t('mouseReturnIdleHint'),
                  children: h('input', {
                    className: 'pg-input', type: 'number', min: 0, max: 86400, step: 1,
                    value: cfg.inputReturnIdleSeconds ?? 0, 'aria-label': t('mouseReturnIdle'),
                    onChange: (event) => update('inputReturnIdleSeconds')(Number(event.target.value)),
                  }),
                }),
              )
            : null,

          Field({
            label: t('cameraEnabled'),
            hint: t('cameraEnabledHint'),
            switch: {
              checked: cfg.cameraEnabled === true,
              onChange: (value) => update('cameraEnabled')(value),
            },
          }),
          cfg.cameraEnabled === true
            ? h('div', { className: 'pg-subgroup' },
                Field({
                  label: t('cameraDevice'),
                  hint: t('cameraDeviceHint'),
                  children: h('input', {
                    className: 'pg-input', type: 'number', min: 0, max: 8, step: 1,
                    value: cfg.cameraDevice ?? '', 'aria-label': t('cameraDevice'),
                    onChange: (event) => update('cameraDevice')(event.target.value === '' ? '' : Number(event.target.value)),
                  }),
                }),
                Field({
                  label: t('cameraFaceWidth'),
                  hint: t('cameraFaceWidthHint'),
                  children: h('input', {
                    className: 'pg-input', type: 'number', min: 8, max: 30, step: 0.5,
                    value: cfg.cameraFaceWidthCm ?? 14, 'aria-label': t('cameraFaceWidth'),
                    onChange: (event) => update('cameraFaceWidthCm')(Number(event.target.value)),
                  }),
                }),
                Field({
                  label: t('cameraFov'),
                  hint: t('cameraFovHint'),
                  children: h('input', {
                    className: 'pg-input', type: 'number', min: 30, max: 120, step: 1,
                    value: cfg.cameraFovDeg ?? 60, 'aria-label': t('cameraFov'),
                    onChange: (event) => update('cameraFovDeg')(Number(event.target.value)),
                  }),
                }),
                Field({
                  label: t('cameraAbsent'),
                  hint: t('cameraAbsentHint'),
                  children: h('input', {
                    className: 'pg-input', type: 'number', min: 1, max: 600, step: 1,
                    value: cfg.cameraAbsentSeconds ?? 12, 'aria-label': t('cameraAbsent'),
                    onChange: (event) => update('cameraAbsentSeconds')(Number(event.target.value)),
                  }),
                }),
              )
            : null,

          Field({
            label: t('awayRule'),
            hint: t('awayRuleHint'),
            children: SourceChecklist({
              t,
              label: t('awayRule'),
              value: cfg.awaySources,
              onChange: update('awaySources'),
            }),
          }),
          Field({
            label: t('returnRule'),
            hint: t('returnRuleHint'),
            children: SourceChecklist({
              t,
              label: t('returnRule'),
              value: cfg.returnSources,
              onChange: update('returnSources'),
            }),
          }),

          Field({
            label: t('pollInterval'),
            hint: t('pollIntervalHint'),
            children: h('input', {
              className: 'pg-input', type: 'number', min: 200, max: 5000, step: 100,
              value: cfg.pollIntervalMs ?? 500, 'aria-label': t('pollInterval'),
              onChange: (event) => update('pollIntervalMs')(Number(event.target.value)),
            }),
          }),
        ),

        h('section', { className: 'pg-card' },
          h('h3', { className: 'pg-card-title' }, t('greetingTitle')),
          Field({
            label: t('greetingEnabled'),
            hint: t('greetingEnabledHint'),
            switch: {
              checked: cfg.greetingEnabled !== false,
              onChange: (value) => update('greetingEnabled')(value),
            },
          }),
          Field({
            label: t('greetingSession'),
            hint: t('greetingSessionHint'),
            children: h('div', { className: 'pg-session-row' },
              h('select', {
                className: 'pg-select',
                value: savedId, 'aria-label': t('greetingSession'),
                onChange: (event) => update('greetingSessionId')(event.target.value),
              },
                h('option', { value: '' }, t('greetingSessionEmpty')),
                !savedId || savedExists ? null : h('option', { value: savedId }, '⚠ ' + savedId),
                grouped.map(([cwd, list]) => h('optgroup', {
                  key: cwd || '__other',
                  label: workspaceTitles.get(cwd) || t('otherSessions'),
                }, list.map((item) => h('option', { key: item.sessionId, value: item.sessionId }, optionLabel(item, true))))),
              ),
              h('button', {
                type: 'button', className: 'pg-btn',
                onClick: () => { void loadSessions() },
              }, t('greetingSessionLoad')),
            ),
          }),
          sessionError ? h('div', { className: 'pg-hint' }, sessionError) : null,
          Field({
            label: t('greetingText'),
            hint: t('greetingTextHint'),
            children: h('textarea', {
              className: 'pg-textarea',
              placeholder: '我回来了，刚才离开了大约 {away}。',
              value: cfg.greetingText ?? '', 'aria-label': t('greetingText'),
              onChange: (event) => update('greetingText')(event.target.value),
            }),
          }),
          Field({
            label: t('cooldown'),
            hint: t('cooldownHint'),
            children: h('input', {
              className: 'pg-input', type: 'number', min: 0, max: 86400, step: 10,
              value: cfg.cooldownSeconds ?? 120, 'aria-label': t('cooldown'),
              onChange: (event) => update('cooldownSeconds')(Number(event.target.value)),
            }),
          }),
          h('div', { className: 'pg-hint' }, t('testHint')),
          h('div', { className: 'pg-actions' },
            h('button', {
              type: 'button', className: 'pg-btn pg-btn-primary',
              disabled: saving, onClick: () => { void save() },
            }, saving ? t('saving') : t('save')),
            h('button', {
              type: 'button', className: 'pg-btn',
              disabled: testing, onClick: () => { void test() },
            }, t('testGreeting')),
            h('button', {
              type: 'button', className: 'pg-btn',
              onClick: () => { void loadState(true); void loadSessions() },
            }, t('refresh')),
          ),
          notice ? h('div', { className: 'pg-notice ' + (notice.kind || 'info') }, notice.text) : null,
          snap
            ? h('div', { className: 'pg-hint' },
                snap.lastGreeting
                  ? (snap.lastGreeting.ok
                      ? t('lastGreeting').replace('{time}', new Date(snap.lastGreeting.at).toLocaleTimeString())
                      : t('greetingFailed').replace('{msg}', snap.lastGreeting.error || ''))
                  : t('neverGreeted'),
              )
            : null,
        ),
      )
    }

    function apply(ctx) {
      ctx.effect(() => ensureStyles())
      ctx.locale.register(NS, { zh, en })
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'presence-greeting',
        order: 26,
        label: () => ctx.locale.bind(NS)('nav'),
        locale: NS,
        inject: () => ({ t: ctx.locale.bind(NS) }),
      }, Section))
    }

    return { inject: ['slots', 'locale'], apply }
  },
})
