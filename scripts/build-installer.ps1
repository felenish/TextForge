# Run from repo root: .\scripts\build-installer.ps1 -Version 0.0.1
param([string]$Version = "0.0.1")

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "==> Building React frontend..." -ForegroundColor Cyan
Push-Location ui/textforge-ui
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host "==> Publishing .NET app (self-contained win-x64)..." -ForegroundColor Cyan
dotnet publish src/TextForge.Desktop/TextForge.Desktop.csproj `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  --output publish/win-x64 `
  /p:SkipBuildReactApp=true `
  /p:Version=$Version

Write-Host "==> Building installer..." -ForegroundColor Cyan
$iscc = if (Get-Command iscc -ErrorAction SilentlyContinue) { "iscc" } else { "C:\Program Files\Inno Setup 7\ISCC.exe" }
& $iscc /DAppVersion=$Version installer\TextForge.iss

Write-Host ""
Write-Host "Done: installer\output\TextForge-Studio-$Version-win-x64-Setup.exe" -ForegroundColor Green
