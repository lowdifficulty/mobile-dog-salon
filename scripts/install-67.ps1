# Installs global "67" command (works in Cursor, CMD, and PowerShell).
# Run once: powershell -ExecutionPolicy Bypass -File scripts/install-67.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BinDir = Join-Path $env:USERPROFILE "bin"
$GlobalCmd = Join-Path $BinDir "67.cmd"
$Marker = "# Mobile Dog Salon - type 67 to start localhost"

$CmdBody = @"
@echo off
cd /d "$ProjectRoot"
call npm run 67
"@

if (-not (Test-Path $BinDir)) {
  New-Item -Path $BinDir -ItemType Directory -Force | Out-Null
}

Set-Content -Path $GlobalCmd -Value $CmdBody -Encoding ASCII

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$BinDir*") {
  $newPath = if ($userPath) { "$userPath;$BinDir" } else { $BinDir }
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  $env:Path = "$env:Path;$BinDir"
  Write-Host "Added $BinDir to your user PATH."
}

if (-not (Test-Path $PROFILE)) {
  New-Item -Path $PROFILE -ItemType File -Force | Out-Null
}

$profileContent = Get-Content -Path $PROFILE -Raw -ErrorAction SilentlyContinue
$psBlock = @"
$Marker
function global:Start-MobileDogSalon67 {
  Push-Location '$ProjectRoot'
  npm run 67
}
Set-Alias -Name 67 -Value Start-MobileDogSalon67 -Scope Global -Force
"@

if ($profileContent -and $profileContent.Contains($Marker)) {
  Write-Host "PowerShell alias already installed."
} else {
  Add-Content -Path $PROFILE -Value "`n$psBlock"
  Write-Host "PowerShell alias installed."
}

Write-Host ""
Write-Host "67 is ready. In any NEW terminal, type: 67"
Write-Host "Build takes about 1-2 minutes; browser opens when ready."
Write-Host "Global command: $GlobalCmd"
Write-Host "Project: $ProjectRoot"
