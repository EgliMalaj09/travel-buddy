<#
  Travel App: stop everything that start.ps1 started on Windows (app, back office, API, emulator, database).

  Double-click scripts\windows\stop.cmd, or in PowerShell:
      C:\dev\tb\scripts\windows\stop.cmd            (stops API, Expo, database, emulator)
      C:\dev\tb\scripts\windows\stop.cmd -KeepEmulator

  Your database data is kept (it uses `docker compose stop`, not `down -v`).
#>
param(
  [switch]$KeepEmulator,   # leave the emulator open (it is slow to boot)
  [switch]$KeepDocker      # leave the database containers running
)

$ErrorActionPreference = 'Continue'
$RepoRoot  = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Backend   = Join-Path $RepoRoot 'backend'
$StateFile = Join-Path $env:TEMP 'travel-buddy-dev.json'

function Step($text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Ok($text)   { Write-Host "    OK  $text" -ForegroundColor Green }

function Stop-Tree($procId) {
  if ($procId -and (Get-Process -Id $procId -ErrorAction SilentlyContinue)) {
    taskkill /PID $procId /T /F *> $null
  }
}
function Stop-Port($port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    Where-Object { $_ -gt 0 } |
    ForEach-Object { Stop-Tree $_ }
}

$state = $null
if (Test-Path $StateFile) {
  try { $state = Get-Content $StateFile -Raw | ConvertFrom-Json } catch { }
}

Step 'App (Expo)'
if ($state) { Stop-Tree $state.expoWindowPid }
Stop-Port 8081
Ok 'Expo stopped'

Step 'Back office'
if ($state) { Stop-Tree $state.backofficeWindowPid }
Stop-Port 5173
Ok 'Back office stopped'

Step 'API'
if ($state) { Stop-Tree $state.apiWindowPid }
Stop-Port 5001
Ok 'API stopped'

if (-not $KeepEmulator) {
  Step 'Android emulator'
  $sdk = $env:ANDROID_HOME
  if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
  if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
  $adb = Join-Path $sdk 'platform-tools\adb.exe'
  if (Test-Path $adb) {
    & $adb devices | Select-String -Pattern '^(emulator-\d+)\s+device' | ForEach-Object {
      & $adb -s $_.Matches[0].Groups[1].Value emu kill *> $null
    }
  }
  if ($state) { Stop-Tree $state.emulatorPid }
  Ok 'Emulator closed'
}

if (-not $KeepDocker) {
  Step 'Database and PowerSync'
  docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    Push-Location $Backend
    docker compose stop
    Pop-Location
  }
  Ok 'Containers stopped (your data is kept)'
}

Remove-Item $StateFile -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'Everything is stopped.' -ForegroundColor Green
Write-Host ''
