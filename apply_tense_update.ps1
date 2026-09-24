
$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "English Haters — Tense Content & Lesson Reader Updater" -ForegroundColor Cyan
Write-Host "Run this file from the ROOT of your English-Hater GitHub repository." -ForegroundColor Yellow
Write-Host ""

$root = Get-Location
$required = @("app.js","backend.js","styles.css","index.html","service-worker.js","data\lessons.js")
foreach ($f in $required) {
    if (-not (Test-Path (Join-Path $root $f))) {
        throw "Missing $f. Open the English-Hater repository folder first, then run this script again."
    }
}

# Backup
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root "_backup_tense_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
foreach ($f in @("app.js","backend.js","styles.css","index.html","service-worker.js","supabase-setup.sql","supabase-setup-v2.sql")) {
    $p = Join-Path $root $f
    if (Test-Path $p) {
        $dest = Join-Path $backup $f
        $destDir = Split-Path $dest
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        Copy-Item $p $dest -Force
    }
}
Write-Host "Backup created: $backup" -ForegroundColor DarkGray

# Copy structured content source
$dataDir = Join-Path $root "data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Force -Path $dataDir | Out-Null }
$source = Join-Path $PSScriptRoot "tense-lessons.js"
if (-not (Test-Path $source)) { throw "tense-lessons.js must stay beside this updater." }
Copy-Item $source (Join-Path $dataDir "tense-lessons.js") -Force

# index.html: load tense override after base lessons
$indexPath = Join-Path $root "index.html"
$index = Get-Content $indexPath -Raw -Encoding UTF8
if ($index -notmatch 'data/tense-lessons\.js') {
    $needle = '<script defer src="data/lessons.js"></script>'
    if (-not $index.Contains($needle)) { throw "Could not find lessons.js script tag in index.html." }
    $index = $index.Replace($needle, $needle + "`r`n  " + '<script defer src="data/tense-lessons.js"></script>')
    Set-Content $indexPath $index -Encoding UTF8
}
Write-Host "[OK] index.html" -ForegroundColor Green

# backend.js: include structured sections from Supabase
$backendPath = Join-Path $root "backend.js"
$backend = Get-Content $backendPath -Raw -Encoding UTF8
if ($backend -notmatch 'sections:\s*Array\.isArray\(l\.sections\)') {
    $old = "examples: Array.isArray(l.examples) ? l.examples : [],"
    $new = $old + "`r`n      sections: Array.isArray(l.sections) ? l.sections : [],"
    if (-not $backend.Contains($old)) { throw "Could not locate mapCloudLesson examples mapping in backend.js." }
    $backend = $backend.Replace($old,$new)
    Set-Content $backendPath $backend -Encoding UTF8
}
Write-Host "[OK] backend.js" -ForegroundColor Green

# app.js: structured lesson reader
$appPath = Join-Path $root "app.js"
$app = Get-Content $appPath -Raw -Encoding UTF8
$startMarker = "function rule(){"
$endMarker = "function trackSwitcher(){"
$start = $app.IndexOf($startMarker)
$end = $app.IndexOf($endMarker)
if ($start -lt 0 -or $end -le $start) { throw "Could not locate rule() in app.js." }

$newRule = @'
function rule(){
  const l=getLesson(state.track,state.topic);
  const title=l?.title||humanTopic(state.topic);
  const ruleText=l?.rule||'A short lesson has not been added yet. You can still practice the available questions for this topic.';
  const examples=Array.isArray(l?.examples)?l.examples:[];
  const sections=Array.isArray(l?.sections)?l.sections:[];
  const stats=getTopicStats(state.track,state.topic);

  const sectionHtml=sections.length?`<div class="lesson-sections">${sections.map((s,i)=>{
    const ex=Array.isArray(s.examples)?s.examples:[];
    return `<section class="lesson-section">
      <div class="lesson-section-head">
        <span class="lesson-step">${String(i+1).padStart(2,'0')}</span>
        <div>
          ${s.tag?`<span class="lesson-tag">${esc(s.tag)}</span>`:''}
          <h3>${esc(s.title||`Section ${i+1}`)}</h3>
        </div>
      </div>
      <div class="lesson-section-body">${esc(s.body||'')}</div>
      ${ex.length?`<div class="lesson-examples"><b>Examples</b>${ex.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:''}
      ${s.tip?`<div class="lesson-tip"><b>💡 মনে রাখো</b><span>${esc(s.tip)}</span></div>`:''}
    </section>`;
  }).join('')}</div>`:'';

  return `${header()}
    <button class="cta secondary" id="backLearn">← Back to topics</button>
    <div style="height:12px"></div>
    <div class="card rule lesson-reader">
      <div class="eyebrow">Learn • ${esc(tracks[state.track]?.name||state.track)}</div>
      <h2>${esc(title)}</h2>
      <p class="lesson-intro">${esc(ruleText)}</p>
      ${sectionHtml}
      ${!sections.length&&examples.length?`<div class="example"><b>Example${examples.length>1?'s':''}</b><br>${examples.map(esc).join(' • ')}</div>`:''}
      <div class="mastery-box">
        <div><b>${stats.mastery}% mastery</b><span>${stats.attempts} attempts • ${stats.accuracy}% accuracy</span></div>
        <div class="progress"><i style="width:${stats.mastery}%"></i></div>
      </div>
      <button class="cta" id="practiceTopic">Practice this topic</button>
    </div>`;
}
'@

$app = $app.Substring(0,$start) + $newRule + "`r`n" + $app.Substring($end)
Set-Content $appPath $app -Encoding UTF8
Write-Host "[OK] app.js — structured lesson reader" -ForegroundColor Green

# styles.css: reader styling
$stylesPath = Join-Path $root "styles.css"
$styles = Get-Content $stylesPath -Raw -Encoding UTF8
if ($styles -notmatch 'lesson-sections') {
$extraCss = @'

/* English Haters structured lesson reader */
.lesson-reader{padding:22px}
.lesson-intro{white-space:pre-line;color:var(--muted);margin:8px 0 18px}
.lesson-sections{display:grid;gap:14px;margin:18px 0}
.lesson-section{border:1px solid var(--line);border-radius:20px;padding:17px;background:linear-gradient(180deg,#fff 0%,#fcfbff 100%)}
.lesson-section-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
.lesson-section-head h3{margin:3px 0 0;font-size:18px;line-height:1.3}
.lesson-step{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border-radius:12px;background:#f0eeff;color:var(--accent);font-weight:900;font-size:12px}
.lesson-tag{display:inline-flex;padding:4px 8px;border-radius:999px;background:#f3f1ff;color:var(--accent);font-size:10px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
.lesson-section-body{white-space:pre-line;line-height:1.75;font-size:14px}
.lesson-examples{margin-top:12px;padding:13px 14px;border-radius:15px;background:#f6f5ff;border:1px solid #e7e3ff;display:grid;gap:7px;font-size:13px;line-height:1.55}
.lesson-examples>b{color:var(--accent)}
.lesson-tip{margin-top:12px;padding:12px 14px;border-radius:15px;background:#fff8e8;border:1px solid #f5dfaa;display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.55}
.lesson-tip b{white-space:nowrap}
@media(max-width:560px){
  .lesson-reader{padding:16px}
  .lesson-section{padding:14px}
  .lesson-section-head h3{font-size:16px}
  .lesson-tip{display:grid;gap:4px}
}
'@
    Add-Content $stylesPath $extraCss -Encoding UTF8
}
Write-Host "[OK] styles.css" -ForegroundColor Green

# service worker cache bump + include new content file
$swPath = Join-Path $root "service-worker.js"
$sw = Get-Content $swPath -Raw -Encoding UTF8
$sw = [regex]::Replace($sw, "const CACHE='english-haters-[^']+';", "const CACHE='english-haters-v12-tense-content';")
if ($sw -notmatch "data/tense-lessons\.js") {
    $sw = $sw.Replace("'data/lessons.js'","'data/lessons.js','data/tense-lessons.js'")
}
Set-Content $swPath $sw -Encoding UTF8
Write-Host "[OK] service-worker.js" -ForegroundColor Green

# Supabase setup SQL files: document structured sections for future fresh setups
foreach ($sqlName in @("supabase-setup.sql","supabase-setup-v2.sql")) {
    $sqlPath = Join-Path $root $sqlName
    if (Test-Path $sqlPath) {
        $sql = Get-Content $sqlPath -Raw -Encoding UTF8
        if ($sql -notmatch 'sections jsonb') {
            $needle = "examples jsonb not null default '[]'::jsonb,"
            if ($sql.Contains($needle)) {
                $sql = $sql.Replace($needle, $needle + "`r`n  sections jsonb not null default '[]'::jsonb,")
                Set-Content $sqlPath $sql -Encoding UTF8
            }
        }
    }
}
Write-Host "[OK] Supabase setup files" -ForegroundColor Green

Write-Host ""
Write-Host "Update complete." -ForegroundColor Cyan
Write-Host "Changed / added:" -ForegroundColor White
Write-Host "  data\tense-lessons.js"
Write-Host "  index.html"
Write-Host "  backend.js"
Write-Host "  app.js"
Write-Host "  styles.css"
Write-Host "  service-worker.js"
Write-Host "  supabase-setup.sql / supabase-setup-v2.sql (if present)"
Write-Host ""
Write-Host "Next: Open GitHub Desktop → review Changes → commit → Push origin." -ForegroundColor Yellow
Write-Host "Suggested commit: Add structured Tense master notes and lesson reader"
Write-Host ""
