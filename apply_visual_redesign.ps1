$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "English Haters — Visual Redesign Pack" -ForegroundColor Cyan
Write-Host "Run this from the ROOT of the English-Hater repository." -ForegroundColor Yellow
Write-Host ""

$root = Get-Location
$stylesPath = Join-Path $root "styles.css"
$swPath = Join-Path $root "service-worker.js"

if (-not (Test-Path $stylesPath)) { throw "styles.css not found. Open the English-Hater repo root and run again." }
if (-not (Test-Path $swPath)) { throw "service-worker.js not found. Open the English-Hater repo root and run again." }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root "_backup_visual_redesign_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Copy-Item $stylesPath (Join-Path $backup "styles.css") -Force
Copy-Item $swPath (Join-Path $backup "service-worker.js") -Force

$styles = Get-Content $stylesPath -Raw -Encoding UTF8
if ($styles -notmatch "English Haters Visual Redesign") {
$extraCss = @'

/* =========================================================
   English Haters Visual Redesign
   Ambient gradients • glassmorphism • hover motion
   ========================================================= */

:root{
  --eh-bg-1:#f8f6ff;
  --eh-bg-2:#eef2ff;
  --eh-bg-3:#fff8f2;
  --eh-surface:rgba(255,255,255,.78);
  --eh-surface-strong:rgba(255,255,255,.92);
  --eh-line:rgba(126,98,255,.15);
  --eh-shadow:0 20px 60px rgba(47,35,115,.12);
  --eh-shadow-soft:0 12px 30px rgba(71,54,165,.10);
  --eh-accent-1:#6f5bff;
  --eh-accent-2:#8f7dff;
  --eh-accent-3:#a784ff;
  --eh-pink:#ff85d5;
  --eh-cyan:#64d9ff;
  --eh-orange:#ffb36b;
}

html,body{
  min-height:100%;
  background:
    radial-gradient(circle at 0% 0%, rgba(111,91,255,.16), transparent 32%),
    radial-gradient(circle at 100% 10%, rgba(255,133,213,.12), transparent 28%),
    radial-gradient(circle at 20% 100%, rgba(100,217,255,.12), transparent 26%),
    linear-gradient(180deg, var(--eh-bg-1) 0%, var(--eh-bg-2) 52%, var(--eh-bg-3) 100%);
  background-attachment: fixed;
}

body{
  position:relative;
  overflow-x:hidden;
}

body::before,
body::after{
  content:"";
  position:fixed;
  inset:auto;
  width:38rem;
  height:38rem;
  border-radius:999px;
  filter:blur(28px);
  opacity:.34;
  pointer-events:none;
  z-index:0;
  animation:ehFloat 18s ease-in-out infinite;
}
body::before{
  top:-10rem;
  left:-8rem;
  background:radial-gradient(circle at 30% 30%, rgba(111,91,255,.34), rgba(111,91,255,.10) 45%, transparent 68%);
}
body::after{
  right:-10rem;
  bottom:-10rem;
  background:radial-gradient(circle at 50% 50%, rgba(255,133,213,.24), rgba(100,217,255,.16) 45%, transparent 70%);
  animation-duration:22s;
  animation-direction:alternate;
}

@keyframes ehFloat{
  0%{transform:translate3d(0,0,0) scale(1)}
  50%{transform:translate3d(18px,-18px,0) scale(1.06)}
  100%{transform:translate3d(-8px,12px,0) scale(.98)}
}

#app, .app, .shell, main, .page{
  position:relative;
  z-index:1;
}

.card,
.rule,
.panel,
.sheet,
.modal,
.drawer,
.quiz-card,
.topic-card,
.path-card,
.exam-card,
.mission-card,
.stats-card,
.profile-card,
nav.bottom,
.bottom-nav,
.nav-shell{
  background:var(--eh-surface);
  border:1px solid var(--eh-line);
  box-shadow:var(--eh-shadow-soft);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.card:hover,
.quiz-card:hover,
.topic-card:hover,
.exam-card:hover,
.mission-card:hover,
.stats-card:hover,
.profile-card:hover{
  transform:translateY(-2px);
  box-shadow:0 18px 42px rgba(73,58,170,.14);
  transition:transform .25s ease, box-shadow .25s ease;
}

.card,
.quiz-card,
.topic-card,
.exam-card,
.mission-card,
.stats-card,
.profile-card{
  transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease, background .25s ease;
}

.hero,
.hero-card,
.dashboard-hero,
.spotlight,
.banner,
.today-card,
.welcome-card,
.main-hero{
  position:relative;
  overflow:hidden;
  background:
    linear-gradient(135deg, rgba(37,29,100,.96), rgba(88,70,199,.92) 56%, rgba(131,112,255,.88) 100%);
  color:#fff;
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 24px 70px rgba(43,28,124,.28);
}
.hero::before,
.hero-card::before,
.dashboard-hero::before,
.spotlight::before,
.banner::before,
.today-card::before,
.welcome-card::before,
.main-hero::before{
  content:"";
  position:absolute;
  right:-6rem;
  top:-4rem;
  width:18rem;
  height:18rem;
  border-radius:999px;
  background:radial-gradient(circle, rgba(255,255,255,.18), transparent 62%);
}
.hero::after,
.hero-card::after,
.dashboard-hero::after,
.spotlight::after,
.banner::after,
.today-card::after,
.welcome-card::after,
.main-hero::after{
  content:"";
  position:absolute;
  left:-4rem;
  bottom:-5rem;
  width:14rem;
  height:14rem;
  border-radius:999px;
  background:radial-gradient(circle, rgba(100,217,255,.18), transparent 60%);
}
.hero *,
.hero-card *,
.dashboard-hero *,
.spotlight *,
.banner *,
.today-card *,
.welcome-card *,
.main-hero *{
  position:relative;
  z-index:1;
}

.cta,
button.cta,
button,
.btn,
.primary-btn,
.secondary-btn,
.action-btn{
  transition:transform .18s ease, box-shadow .25s ease, filter .25s ease, background .25s ease;
}

.cta.primary,
button.cta:not(.secondary),
.btn-primary,
.primary-btn{
  background:linear-gradient(135deg, var(--eh-accent-1), var(--eh-accent-3));
  color:#fff;
  box-shadow:0 12px 28px rgba(111,91,255,.28);
  border:0;
}
.cta.secondary,
.btn-secondary{
  background:rgba(255,255,255,.66);
  border:1px solid rgba(111,91,255,.16);
  color:#4331b8;
}

.cta:hover,
button:hover,
.btn:hover,
.primary-btn:hover,
.secondary-btn:hover,
.action-btn:hover{
  transform:translateY(-1px) scale(1.01);
  filter:saturate(1.05);
}

button:active,
.cta:active,
.btn:active{
  transform:translateY(0) scale(.99);
}

.badge,
.chip,
.eyebrow,
.pill,
.tag{
  background:linear-gradient(135deg, rgba(111,91,255,.14), rgba(143,125,255,.12));
  color:#5a47d8;
  border:1px solid rgba(111,91,255,.15);
}

.progress,
.progress-track,
.meter,
.bar{
  background:rgba(111,91,255,.12);
  overflow:hidden;
}
.progress > i,
.progress-fill,
.meter > i,
.bar > i{
  background:linear-gradient(90deg, #7e6aff 0%, #8e7cff 50%, #b486ff 100%);
  box-shadow:0 0 18px rgba(126,106,255,.35);
}

input,
select,
textarea{
  background:rgba(255,255,255,.78);
  border:1px solid rgba(111,91,255,.14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7);
}
input:focus,
select:focus,
textarea:focus{
  outline:none;
  border-color:rgba(111,91,255,.42);
  box-shadow:0 0 0 4px rgba(111,91,255,.12);
}

nav,
.bottom-nav,
.nav-shell,
.tabbar{
  background:rgba(255,255,255,.80);
  border:1px solid rgba(111,91,255,.16);
  box-shadow:0 16px 40px rgba(48,34,120,.12);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.nav-item,
.bottom-nav a,
nav a,
.tab{
  transition:transform .2s ease, color .2s ease, background .2s ease;
}
.nav-item:hover,
.bottom-nav a:hover,
nav a:hover,
.tab:hover{
  transform:translateY(-1px);
}
.nav-item.active,
.bottom-nav a.active,
nav a.active,
.tab.active{
  background:linear-gradient(135deg, rgba(111,91,255,.14), rgba(180,134,255,.16));
  color:#5a47d8;
}

img.avatar,
.avatar,
.profile-avatar{
  box-shadow:0 10px 25px rgba(88,64,180,.20);
  border:2px solid rgba(255,255,255,.75);
}

.small-stat,
.stat,
.kpi,
.metric{
  position:relative;
  overflow:hidden;
}
.small-stat::after,
.stat::after,
.kpi::after,
.metric::after{
  content:"";
  position:absolute;
  right:-24px;
  top:-24px;
  width:90px;
  height:90px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(111,91,255,.12), transparent 70%);
}

.section-title,
h1,h2,h3{
  letter-spacing:-.02em;
}

@media (prefers-reduced-motion:no-preference){
  .card,
  .quiz-card,
  .topic-card,
  .exam-card,
  .mission-card,
  .stats-card,
  .profile-card{
    animation:ehFadeUp .45s ease both;
  }
  .card:nth-child(2){animation-delay:.04s}
  .card:nth-child(3){animation-delay:.08s}
  .card:nth-child(4){animation-delay:.12s}
}
@keyframes ehFadeUp{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:translateY(0)}
}

@media (max-width: 700px){
  body::before, body::after{
    width:26rem;
    height:26rem;
    filter:blur(22px);
    opacity:.28;
  }
}

/* End English Haters Visual Redesign */
'@
    Add-Content $stylesPath $extraCss -Encoding UTF8
    Write-Host "[OK] Visual redesign CSS appended to styles.css" -ForegroundColor Green
} else {
    Write-Host "[OK] Visual redesign CSS already exists in styles.css" -ForegroundColor Green
}

$sw = Get-Content $swPath -Raw -Encoding UTF8
$updated = [regex]::Replace($sw, "const CACHE='english-haters-[^']+';", "const CACHE='english-haters-v14-visual-redesign';")
if ($updated -eq $sw -and $sw -notmatch "english-haters-v14-visual-redesign") {
    throw "Could not locate CACHE constant in service-worker.js."
}
Set-Content $swPath $updated -Encoding UTF8
Write-Host "[OK] service-worker cache bumped" -ForegroundColor Green

Write-Host ""
Write-Host "VISUAL REDESIGN COMPLETE" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Open GitHub Desktop"
Write-Host "2. Review styles.css and service-worker.js"
Write-Host "3. Commit: Redesign UI with gradients glassmorphism and motion"
Write-Host "4. Push origin"
Write-Host "5. After deploy, hard refresh the site (Ctrl+Shift+R)"
Write-Host ""
