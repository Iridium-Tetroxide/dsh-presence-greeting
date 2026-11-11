# Presence sensor + keyboard/mouse activity bridge for dsh-presence-greeting.
# Emits newline-delimited JSON on stdout. One tick every -IntervalMs.

param(
  [int]$IntervalMs = 400
)

$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Monotonic-enough millisecond clock. [Environment]::TickCount64 is unusable here
# (it evaluates to $null under the harness sandbox), so use epoch milliseconds.
function Now-Ms {
  return [double]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
}

# --- WinRT await helper (PowerShell 5.1) -------------------------------------
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]

function Await($op, [Type]$type) {
  $method = $asTaskGeneric.MakeGenericMethod($type)
  $task = $method.Invoke($null, @($op))
  if (-not $task.Wait(15000)) { throw 'WinRT operation timed out' }
  return $task.Result
}

# --- Keyboard + mouse idle (system-wide last input) ---------------------------
Add-Type -Namespace PresenceBridge -Name Native -MemberDefinition @'
[StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
[DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
public static long IdleMs() {
  LASTINPUTINFO li = new LASTINPUTINFO();
  li.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
  if (!GetLastInputInfo(ref li)) return -1;
  uint idle = unchecked((uint)(Environment.TickCount - (int)li.dwTime));
  return (long)idle;
}
'@

function Get-InputIdleMs {
  try { return [PresenceBridge.Native]::IdleMs() } catch { return -1 }
}

# --- IR presence sensor (HID Sensor Collection V2 via WinRT) ------------------
$script:SensorType = [Windows.Devices.Sensors.HumanPresenceSensor, Windows.Devices.Sensors, ContentType=WindowsRuntime]
$script:Sensor = $null
$script:SensorInfo = @{
  available = $false
  reason    = 'not-initialized'
  deviceId  = $null
  minMm     = $null
  maxMm     = $null
}
$script:LastSensorAttempt = -100000

function Initialize-Sensor {
  $script:LastSensorAttempt = Now-Ms
  try {
    $op = $script:SensorType::GetDefaultAsync()
    $sensor = Await $op $script:SensorType
    if ($null -eq $sensor) {
      $script:Sensor = $null
      $script:SensorInfo = @{ available = $false; reason = 'no-default-presence-sensor'; deviceId = $null; minMm = $null; maxMm = $null }
      return
    }
    $script:Sensor = $sensor
    $minMm = $null
    $maxMm = $null
    try { $minMm = [double]$sensor.MinDetectableDistanceInMillimeters } catch {}
    try { $maxMm = [double]$sensor.MaxDetectableDistanceInMillimeters } catch {}
    $script:SensorInfo = @{
      available = $true
      reason    = $null
      deviceId  = [string]$sensor.DeviceId
      minMm     = $minMm
      maxMm     = $maxMm
    }
  } catch {
    $script:Sensor = $null
    $script:SensorInfo = @{ available = $false; reason = [string]$_.Exception.Message; deviceId = $null; minMm = $null; maxMm = $null }
  }
}

function Read-Sensor {
  if ($null -eq $script:Sensor) { return @{ available = $false; presence = $null; distanceMm = $null; error = $null } }
  try {
    $reading = $script:Sensor.GetCurrentReading()
    if ($null -eq $reading) {
      return @{ available = $true; presence = 'unknown'; distanceMm = $null; error = $null }
    }
    $presence = $null
    try { $presence = ([string]$reading.Presence).ToLowerInvariant() } catch {}
    $distanceMm = $null
    try {
      $dist = $reading.DistanceInMillimeters
      if ($null -ne $dist) {
        if ($dist -is [System.Double]) { $distanceMm = [double]$dist }
        elseif ($null -ne $dist.Value) { $distanceMm = [double]$dist.Value }
      }
    } catch {}
    return @{ available = $true; presence = $presence; distanceMm = $distanceMm; error = $null }
  } catch {
    return @{ available = $true; presence = $null; distanceMm = $null; error = [string]$_.Exception.Message }
  }
}

Initialize-Sensor
$null = [Console]::Out.WriteLine((ConvertTo-Json -Compress -Depth 5 @{ type = 'hello'; pid = $PID; sensor = $script:SensorInfo }))

# --- Main loop ---------------------------------------------------------------
while ($true) {
  Start-Sleep -Milliseconds $IntervalMs

  $now = Now-Ms

  # Keyboard + mouse: one shared idle timer, any key press or mouse move resets it.
  $idleMs = Get-InputIdleMs
  $inputState = @{
    idleMs      = if ($idleMs -ge 0) { $idleMs } else { $null }
    lastInputAt = if ($idleMs -ge 0) { $now - $idleMs } else { $null }
  }

  # Sensor: retry discovery every 20s while unavailable.
  if ($null -eq $script:Sensor -and ($now - $script:LastSensorAttempt) -ge 20000) {
    Initialize-Sensor
    $null = [Console]::Out.WriteLine((ConvertTo-Json -Compress -Depth 5 @{ type = 'sensor-info'; sensor = $script:SensorInfo }))
  }

  $sensorReading = Read-Sensor
  if ($null -eq $script:SensorInfo.available -or -not $script:SensorInfo.available) {
    $sensorReading = @{ available = $false; presence = $null; distanceMm = $null; error = $null }
  }

  $tick = @{
    type   = 'tick'
    now    = $now
    sensor = $sensorReading
    input  = $inputState
  }
  $null = [Console]::Out.WriteLine((ConvertTo-Json -Compress -Depth 5 $tick))
}
