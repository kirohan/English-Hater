$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "English Haters — Protected Content Device Hotfix" -ForegroundColor Cyan
Write-Host "Run this from the ROOT of the English-Hater repository." -ForegroundColor Yellow
Write-Host ""

$root = Get-Location
$backendPath = Join-Path $root "backend.js"
$swPath = Join-Path $root "service-worker.js"

if (-not (Test-Path $backendPath)) { throw "backend.js not found. Run this from the English-Hater repo root." }
if (-not (Test-Path $swPath)) { throw "service-worker.js not found. Run this from the English-Hater repo root." }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root "_backup_device_hotfix_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Copy-Item $backendPath (Join-Path $backup "backend.js") -Force
Copy-Item $swPath (Join-Path $backup "service-worker.js") -Force

$backend = Get-Content $backendPath -Raw -Encoding UTF8

$old = "const { data, error } = await client.functions.invoke('student-content', { body: payload });"
$new = "const { data, error } = await client.functions.invoke('student-content', { body: { ...payload, device_key: deviceKey } });"

if ($backend.Contains($old)) {
    $backend = $backend.Replace($old, $new)
    Set-Content $backendPath $backend -Encoding UTF8
    Write-Host "[OK] backend.js now sends device_key to protected content." -ForegroundColor Green
}
elseif ($backend -match "device_key:\s*deviceKey") {
    Write-Host "[OK] backend.js already contains the device-key fix." -ForegroundColor Green
}
else {
    throw "Could not locate the student-content invoke call in backend.js. The file structure differs from the expected version."
}

$sw = Get-Content $swPath -Raw -Encoding UTF8
$updated = [regex]::Replace(
    $sw,
    "const CACHE='english-haters-[^']+';",
    "const CACHE='english-haters-v13-device-hotfix';"
)
if ($updated -eq $sw -and $sw -notmatch "english-haters-v13-device-hotfix") {
    throw "Could not locate CACHE constant in service-worker.js."
}
Set-Content $swPath $updated -Encoding UTF8
Write-Host "[OK] service-worker cache bumped." -ForegroundColor Green

Write-Host ""
Write-Host "HOTFIX COMPLETE" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now in GitHub Desktop:" -ForegroundColor White
Write-Host "1. Review backend.js + service-worker.js"
Write-Host "2. Commit: Fix protected content device authentication"
Write-Host "3. Push origin"
Write-Host ""
Write-Host "After deployment:" -ForegroundColor White
Write-Host "1. Reload once."
Write-Host "2. If the old screen remains, use Ctrl+Shift+R."
Write-Host "3. If needed, sign out and sign in once to re-register the device."
Write-Host ""
