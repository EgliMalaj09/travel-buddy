<#
  Travel App: start everything for local development on Windows (Android emulator).

  Double-click scripts\windows\start.cmd, or in PowerShell:
      C:\dev\tb\scripts\windows\start.cmd

  What it does, in order (each step is skipped when it is already running):
    1. Docker Desktop        starts it and waits until it is ready
    2. Database + PowerSync + photo storage (Azurite)  docker compose up (backend\docker-compose.yml)
    3. Database tables       dotnet ef database update (EF Core migrations)
    4. API                   dotnet run, in its own window, http://localhost:5001
    5. Back office           npm run dev in backoffice\, in its own window, http://localhost:5173 (skip: -NoBackOffice)
    6. Android emulator      starts your first emulator (or -Avd <name>) and waits for it to boot
    7. App                   npx expo start --dev-client --android, in its own window
                             (first time only: npx expo run:android, which builds and installs the app)

  Stop everything with scripts\windows\stop.cmd.
#>
param(
  [string]$Avd = '',        # emulator name; default = first one in `emulator -list-avds`
  [switch]$NoEmulator,      # skip starting the emulator (for example when a phone is plugged in)
  [switch]$Rebuild,         # rebuild and reinstall the Android app (after adding a native library)
  [switch]$NoBackOffice     # do not start the back office web app
)

# 'Continue' on purpose: in Windows PowerShell 5.1, 'Stop' turns any stderr line from docker/dotnet/adb into a crash.
# Every step checks $LASTEXITCODE itself instead.
$ErrorActionPreference = 'Continue'
$RepoRoot   = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Backend    = Join-Path $RepoRoot 'backend'
$Frontend   = Join-Path $RepoRoot 'frontend'
$BackOffice = Join-Path $RepoRoot 'backoffice'
$BackOfficeUrl = 'http://localhost:5173'
$ApiProject = 'src/TravelApp.Api'
$ApiUrl     = 'http://localhost:5001'
$AppPackage = 'app.travelapp.mobile'
$StateFile  = Join-Path $env:TEMP 'travel-buddy-dev.json'

function Step($text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Ok($text)   { Write-Host "    OK  $text" -ForegroundColor Green }
function Info($text) { Write-Host "    $text" }
function Fail($text) {
  Write-Host ''
  Write-Host "    STOPPED: $text" -ForegroundColor Red
  Write-Host ''
  exit 1
}
function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function PortListening($port) {
  [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

# Opens a new PowerShell window that runs $command in $dir and stays open, returns its process.
function Start-Window($title, $dir, $command) {
  $full = "`$host.UI.RawUI.WindowTitle = '$title'; Set-Location '$dir'; $command"
  Start-Process powershell -PassThru -WorkingDirectory $dir `
    -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $full)
}

Write-Host ''
Write-Host 'Travel App: starting everything (Windows + Android)' -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"

# ---------- 0. Tools ----------
Step 'Checking tools'
foreach ($t in @('docker', 'dotnet', 'node', 'npx')) {
  if (-not (Have $t)) { Fail "'$t' is not installed or not on PATH. Install it, close this window and try again." }
}
# dotnet global tools (dotnet-ef) live here; make sure this window can find them.
$dotnetTools = Join-Path $env:USERPROFILE '.dotnet\tools'
if (($env:Path -split ';') -notcontains $dotnetTools) { $env:Path = "$env:Path;$dotnetTools" }
Ok 'docker, dotnet, node found'

# ---------- 1. Docker Desktop ----------
Step 'Docker Desktop'
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  $dockerExe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (-not (Test-Path $dockerExe)) { Fail "Docker Desktop not found at $dockerExe. Open Docker Desktop yourself, then run this again." }
  Info 'Starting Docker Desktop (can take 1-2 minutes)...'
  Start-Process $dockerExe | Out-Null
  $deadline = (Get-Date).AddMinutes(4)
  do {
    Start-Sleep -Seconds 3
    docker info *> $null
  } while ($LASTEXITCODE -ne 0 -and (Get-Date) -lt $deadline)
  if ($LASTEXITCODE -ne 0) { Fail 'Docker Desktop did not become ready in 4 minutes. Open it, wait until it says "Engine running", then run this again.' }
}
Ok 'Docker is running'

# ---------- 2. Database + PowerSync ----------
Step 'Database (PostgreSQL) and PowerSync'
Push-Location $Backend
try {
  docker compose up -d --wait postgres
  if ($LASTEXITCODE -ne 0) { Fail 'The database container did not start. Run "docker compose logs postgres" in the backend folder to see why.' }
  Ok 'PostgreSQL is ready on localhost:5432'
  docker compose up -d powersync
  if ($LASTEXITCODE -ne 0) { Write-Host '    WARNING: PowerSync did not start (login and the app still work without it). Try again later.' -ForegroundColor Yellow }
  else { Ok 'PowerSync is running on localhost:8080' }
  # Photo files (KAN-40): Azurite, the free Azure Blob Storage emulator. Only the API talks to it.
  docker compose up -d azurite
  if ($LASTEXITCODE -ne 0) { Write-Host '    WARNING: Photo storage (Azurite) did not start: photos stay on the phone until it runs. Try again later.' -ForegroundColor Yellow }
  else { Ok 'Photo storage (Azurite) is running on localhost:10000' }
} finally { Pop-Location }

# ---------- 3. Database tables (migrations) ----------
Step 'Database tables (EF Core migrations)'
# dotnet-ef must match the EF Core version of the backend (10.x); a newer major does not restore by itself.
$efWanted = '10.0.15'
$efVersion = (dotnet ef --version 2>$null | Select-Object -Last 1)
if ($LASTEXITCODE -ne 0 -or -not $efVersion) {
  Info "Installing dotnet-ef $efWanted (one time)..."
  dotnet tool install --global dotnet-ef --version $efWanted
  if ($LASTEXITCODE -ne 0) { Fail 'Could not install dotnet-ef.' }
} elseif (-not ($efVersion.Trim()).StartsWith('10.')) {
  Info "Switching dotnet-ef from $($efVersion.Trim()) to $efWanted (matches the backend)..."
  dotnet tool uninstall --global dotnet-ef
  dotnet tool install --global dotnet-ef --version $efWanted
  if ($LASTEXITCODE -ne 0) { Fail 'Could not switch dotnet-ef to version 10.' }
}
Push-Location $Backend
try {
  Info 'Downloading backend libraries (dotnet restore)...'
  dotnet restore
  if ($LASTEXITCODE -ne 0) { Fail 'dotnet restore failed. Check your internet connection and read the red text above.' }
  dotnet ef database update --project $ApiProject
  if ($LASTEXITCODE -ne 0) { Fail 'The database update failed. Read the red text above; often the API code does not build yet (try "dotnet build" in the backend folder).' }
} finally { Pop-Location }
Ok 'Database tables are up to date'

# ---------- 4. API ----------
Step 'API'
$state = @{ }
if (PortListening 5001) {
  Ok "API is already running on $ApiUrl"
} else {
  # Same settings as the "http" launch profile, but without opening a browser.
  # Google login: the API accepts the same client ids the app uses (frontend\.env.local).
  $googleEnv = ''
  $envFile = Join-Path $Frontend '.env.local'
  if (Test-Path $envFile) {
    $i = 0
    foreach ($name in @('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID')) {
      $pattern = "^\s*$name\s*=\s*(\S+)"
      $line = Get-Content $envFile | Where-Object { $_ -match $pattern } | Select-Object -First 1
      if ($line -and ($line -match $pattern)) { $googleEnv += "`$env:Auth__GoogleClientIds__$i = '$($Matches[1])'; "; $i++ }
    }
    if ($i -gt 0) { Info "Google login: $i client id(s) from frontend\.env.local" }
  }
  $apiCmd = "`$env:ASPNETCORE_ENVIRONMENT = 'Development'; `$env:ASPNETCORE_URLS = '$ApiUrl'; $googleEnv" +
            "dotnet run --project $ApiProject --no-launch-profile"
  $p = Start-Window 'Travel App - API (close to stop)' $Backend $apiCmd
  $state.apiWindowPid = $p.Id
  Info 'Started in a new window "Travel App - API". Waiting for it to answer...'
  $deadline = (Get-Date).AddMinutes(3)
  $up = $false
  while (-not $up -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    try {
      $r = Invoke-WebRequest "$ApiUrl/health" -UseBasicParsing -TimeoutSec 3
      $up = ($r.StatusCode -eq 200)
    } catch { }
  }
  if (-not $up) { Fail 'The API did not answer on http://localhost:5001/health in 3 minutes. Look at the "Travel App - API" window for the error.' }
  Ok "API is running on $ApiUrl (try $ApiUrl/scalar in a browser)"
}

# Installs packages again when package-lock.json changed after the last install (a git pull added a library).
function Ensure-Packages($dir, $what) {
  $lockFile = Join-Path $dir 'package-lock.json'
  $installedLock = Join-Path $dir 'node_modules\.package-lock.json'
  if (-not (Test-Path $installedLock) -or ((Get-Item $lockFile).LastWriteTime -gt (Get-Item $installedLock).LastWriteTime)) {
    Info "Installing $what packages (a few minutes)..."
    Push-Location $dir
    try {
      npm install
      if ($LASTEXITCODE -ne 0) { Fail "npm install failed in $dir. Read the red text above." }
    } finally { Pop-Location }
  }
}

# ---------- 5. Back office (KAN-55) ----------
if ($NoBackOffice) {
  Step 'Back office (skipped: -NoBackOffice)'
} else {
  Step 'Back office'
  Ensure-Packages $BackOffice 'back office'
  if (PortListening 5173) {
    Ok "Back office is already running on $BackOfficeUrl"
  } else {
    $p = Start-Window 'Travel App - Back office (close to stop)' $BackOffice 'npm run dev'
    $state.backofficeWindowPid = $p.Id
    $deadline = (Get-Date).AddMinutes(1)
    while (-not (PortListening 5173) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 2 }
    if (PortListening 5173) { Ok "Back office is running on $BackOfficeUrl (open it in your browser)" }
    else { Write-Host '    WARNING: The back office did not start in 1 minute. Look at the "Travel App - Back office" window. The app still works without it.' -ForegroundColor Yellow }
  }
}

# ---------- 6. Android emulator ----------
Step 'Android emulator'
$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$adb      = Join-Path $sdk 'platform-tools\adb.exe'
$emulator = Join-Path $sdk 'emulator\emulator.exe'
if (-not (Test-Path $adb)) { Fail "Android SDK not found at $sdk. Open Android Studio once (it installs the SDK), then run this again." }
$env:ANDROID_HOME = $sdk
if (($env:Path -split ';') -notcontains (Split-Path $adb)) { $env:Path = "$env:Path;$(Split-Path $adb)" }

function DeviceConnected {
  $lines = & $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" }
  return [bool]$lines
}

& $adb start-server *> $null
if (DeviceConnected) {
  Ok 'An emulator or phone is already connected'
} elseif ($NoEmulator) {
  Fail 'No emulator or phone connected (and -NoEmulator was given). Plug in a phone or drop -NoEmulator.'
} else {
  if (-not (Test-Path $emulator)) { Fail 'The Android emulator is not installed. In Android Studio: More Actions > SDK Manager > SDK Tools > Android Emulator.' }
  if (-not $Avd) {
    $Avd = & $emulator -list-avds | Where-Object { $_ -and $_ -notmatch '^INFO' } | Select-Object -First 1
  }
  if (-not $Avd) { Fail 'No emulator exists yet. In Android Studio: More Actions > Virtual Device Manager > Create device.' }
  Info "Starting emulator '$Avd' (first boot can take a few minutes)..."
  $e = Start-Process $emulator -ArgumentList @('-avd', $Avd) -PassThru
  $state.emulatorPid = $e.Id
  $deadline = (Get-Date).AddMinutes(6)
  $booted = $false
  while (-not $booted -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5
    if (DeviceConnected) {
      $b = (& $adb shell getprop sys.boot_completed 2>$null | Out-String).Trim()
      $booted = ($b -eq '1')
    }
  }
  if (-not $booted) { Fail 'The emulator did not finish booting in 6 minutes. Wait until you see the Android home screen, then run this again.' }
  Ok "Emulator '$Avd' is ready"
}

# ---------- 7. App (Expo) ----------
Step 'App (Expo)'
Ensure-Packages $Frontend 'app'
if (PortListening 8081) {
  Ok 'Expo is already running (port 8081). Press "a" in the Expo window to open the app.'
} else {
  $installed = [bool](& $adb shell pm list packages $AppPackage 2>$null | Select-String -SimpleMatch "package:$AppPackage")
  if ($Rebuild -or -not $installed) {
    Info 'The app is not installed on the emulator yet: building it (first time takes 10-20 minutes)...'
    $expoCmd = 'npx expo run:android'
  } else {
    $expoCmd = 'npx expo start --dev-client --android'
  }
  $p = Start-Window 'Travel App - Expo (close to stop)' $Frontend $expoCmd
  $state.expoWindowPid = $p.Id
  Ok 'Started in a new window "Travel App - Expo". The app opens on the emulator by itself.'
}

# Remember what we started so stop.ps1 can close it.
$state | ConvertTo-Json | Set-Content -Path $StateFile -Encoding UTF8

Write-Host ''
Write-Host 'All started.' -ForegroundColor Green
Write-Host "  API:     $ApiUrl/scalar   (login codes appear in the API window as [dev email])"
if (-not $NoBackOffice) { Write-Host "  Back office: $BackOfficeUrl   (log in with your app account + authenticator code)" }
Write-Host '  App:     on the emulator; press "r" in the Expo window to reload'
Write-Host '  Stop:    scripts\windows\stop.cmd'
Write-Host ''
