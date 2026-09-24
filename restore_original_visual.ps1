$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "English Haters — Remove Redesign Overrides" -ForegroundColor Cyan
Write-Host ""

$root = Get-Location
$stylesPath = Join-Path $root "styles.css"
$swPath = Join-Path $root "service-worker.js"

if (-not (Test-Path $stylesPath)) { throw "styles.css not found." }
if (-not (Test-Path $swPath)) { throw "service-worker.js not found." }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root "_backup_restore_visual_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Copy-Item $stylesPath (Join-Path $backup "styles.css") -Force
Copy-Item $swPath (Join-Path $backup "service-worker.js") -Force

$styles = Get-Content $stylesPath -Raw -Encoding UTF8

$styles = [regex]::Replace(
    $styles,
    '(?s)/\*\s*=+\s*\r?\n\s*English Haters Visual Redesign.*?/\*\s*End English Haters Visual Redesign\s*\*/',
    ''
)
$styles = [regex]::Replace(
    $styles,
    '(?s)/\*\s*English Haters Balanced Redesign START\s*\*/.*?/\*\s*English Haters Balanced Redesign END\s*\*/',
    ''
)

Set-Content $stylesPath ($styles.TrimEnd()+"`r`n") -Encoding UTF8

$sw = Get-Content $swPath -Raw -Encoding UTF8
$updated = [regex]::Replace(
  $sw,
  "const CACHE='english-haters-[^']+';",
  "const CACHE='english-haters-v16-original-visual';"
)
Set-Content $swPath $updated -Encoding UTF8

Write-Host "[OK] Redesign overrides removed. Original stylesheet restored." -ForegroundColor Green
Write-Host ""
Write-Host "Commit: Restore original visual design" -ForegroundColor Yellow
