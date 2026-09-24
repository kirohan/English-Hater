$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "English Haters — Balanced Visual Redesign" -ForegroundColor Cyan
Write-Host "Keeps the original clean UI, adds only subtle depth and gradients." -ForegroundColor Gray
Write-Host ""

$root = Get-Location
$stylesPath = Join-Path $root "styles.css"
$swPath = Join-Path $root "service-worker.js"

if (-not (Test-Path $stylesPath)) { throw "styles.css not found. Run from the English-Hater repo root." }
if (-not (Test-Path $swPath)) { throw "service-worker.js not found. Run from the English-Hater repo root." }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root "_backup_balanced_redesign_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Copy-Item $stylesPath (Join-Path $backup "styles.css") -Force
Copy-Item $swPath (Join-Path $backup "service-worker.js") -Force

$styles = Get-Content $stylesPath -Raw -Encoding UTF8

# Remove the previous strong redesign block if present.
$styles = [regex]::Replace(
    $styles,
    '(?s)/\*\s*=+\s*\r?\n\s*English Haters Visual Redesign.*?/\*\s*End English Haters Visual Redesign\s*\*/',
    ''
)

# Remove this balanced block if rerun, so the script is idempotent.
$styles = [regex]::Replace(
    $styles,
    '(?s)/\*\s*English Haters Balanced Redesign START\s*\*/.*?/\*\s*English Haters Balanced Redesign END\s*\*/',
    ''
)

$extra = @'

/* English Haters Balanced Redesign START */

/* Keep the original white-card identity; only improve the canvas and depth. */
html,body{
  min-height:100%;
  background:
    radial-gradient(circle at 16% 8%, rgba(123,103,255,.08), transparent 30%),
    radial-gradient(circle at 86% 18%, rgba(174,140,255,.07), transparent 28%),
    linear-gradient(180deg,#f9f9fd 0%,#f5f6fb 48%,#faf9ff 100%);
  background-attachment:fixed;
}

body{
  position:relative;
  overflow-x:hidden;
}

/* Very subtle ambient decoration — intentionally restrained. */
body::before,
body::after{
  content:"";
  position:fixed;
  pointer-events:none;
  z-index:0;
  border-radius:50%;
  filter:blur(8px);
  opacity:.35;
}
body::before{
  width:320px;
  height:320px;
  top:90px;
  left:-170px;
  background:radial-gradient(circle,rgba(118,93,255,.10),transparent 68%);
}
body::after{
  width:360px;
  height:360px;
  right:-200px;
  top:360px;
  background:radial-gradient(circle,rgba(159,126,255,.08),transparent 70%);
}

#app,.app,.shell,main,.page{
  position:relative;
  z-index:1;
}

/* Preserve solid white cards — no heavy glass effect. */
.card,
.rule,
.panel,
.sheet,
.quiz-card,
.topic-card,
.path-card,
.exam-card,
.mission-card,
.stats-card,
.profile-card{
  background:#fff;
  border-color:rgba(39,35,74,.08);
  box-shadow:0 10px 26px rgba(42,35,89,.055);
}

/* Slightly stronger emphasis only on meaningful dashboard cards. */
.card:hover,
.topic-card:hover,
.exam-card:hover,
.mission-card:hover{
  box-shadow:0 14px 34px rgba(53,42,113,.075);
}

/* Keep buttons familiar; add a tiny bit of polish. */
.cta,
button,
.btn{
  transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;
}

.cta:hover,
button:hover,
.btn:hover{
  transform:translateY(-1px);
}

/* Accent buttons only — not every surface. */
.cta:not(.secondary),
.btn-primary,
.primary-btn{
  box-shadow:0 8px 20px rgba(111,91,255,.16);
}

/* Improve progress bars without changing the design language. */
.progress,
.progress-track,
.meter{
  overflow:hidden;
}
.progress > i,
.progress-fill,
.meter > i{
  background:linear-gradient(90deg,#7864ff,#9a7dff);
}

/* Keep nav clean and white, just with better separation. */
.nav,
.bottom-nav,
nav{
  box-shadow:0 10px 26px rgba(42,35,89,.07);
}

/* Soft section entry motion only. */
@media (prefers-reduced-motion:no-preference){
  .card,
  .rule,
  .topic-card,
  .exam-card,
  .mission-card{
    animation:ehBalancedIn .28s ease both;
  }
}
@keyframes ehBalancedIn{
  from{opacity:.72;transform:translateY(5px)}
  to{opacity:1;transform:translateY(0)}
}

@media(max-width:700px){
  body::before{width:240px;height:240px;left:-150px}
  body::after{width:260px;height:260px;right:-170px}
}

/* English Haters Balanced Redesign END */
'@

$styles = $styles.TrimEnd() + "`r`n" + $extra + "`r`n"
Set-Content $stylesPath $styles -Encoding UTF8
Write-Host "[OK] Strong redesign removed; balanced styling applied." -ForegroundColor Green

$sw = Get-Content $swPath -Raw -Encoding UTF8
$updated = [regex]::Replace(
  $sw,
  "const CACHE='english-haters-[^']+';",
  "const CACHE='english-haters-v15-balanced-redesign';"
)
if ($updated -eq $sw -and $sw -notmatch "english-haters-v15-balanced-redesign") {
  throw "Could not find CACHE constant in service-worker.js."
}
Set-Content $swPath $updated -Encoding UTF8
Write-Host "[OK] Cache version updated." -ForegroundColor Green

Write-Host ""
Write-Host "DONE" -ForegroundColor Cyan
Write-Host "The original visual identity is preserved; only the background, depth and motion are enhanced." -ForegroundColor White
Write-Host ""
Write-Host "GitHub Desktop commit:" -ForegroundColor Yellow
Write-Host "Refine UI with subtle gradients and depth"
Write-Host ""
