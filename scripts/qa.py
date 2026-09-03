#!/usr/bin/env python3
from pathlib import Path
import json,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]

def fail(msg): errors.append(msg)

# JavaScript parse checks
for name in ['app.js','backend.js','admin.js','cloud-admin.js','launch.js','backend-config.js','service-worker.js','data/questions.js','data/lessons.js']:
    p=ROOT/name
    if not p.exists(): fail(f'missing {name}'); continue
    r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
    if r.returncode: fail(f'JS syntax {name}: {r.stderr.strip()}')

# HTML local references
attr=re.compile(r'''(?:src|href)=["']([^"']+)["']''',re.I)
for html in ROOT.glob('*.html'):
    text=html.read_text(errors='replace')
    for ref in attr.findall(text):
        if ref.startswith(('http://','https://','#','mailto:','tel:','data:','javascript:')): continue
        clean=ref.split('?',1)[0].split('#',1)[0]
        if not clean: continue
        if not (ROOT/clean).exists(): fail(f'{html.name}: missing local ref {clean}')

# Manifest
try:
    manifest=json.loads((ROOT/'manifest.webmanifest').read_text())
    for k in ['name','short_name','start_url','scope','display','theme_color']:
        if not manifest.get(k): fail(f'manifest missing {k}')
except Exception as e: fail(f'manifest invalid: {e}')

# Service worker core assets
sw=(ROOT/'service-worker.js').read_text(errors='replace')
m=re.search(r"const CORE=\[(.*?)\];",sw,re.S)
if not m: fail('service worker CORE list missing')
else:
    for ref in re.findall(r"['\"]([^'\"]+)['\"]",m.group(1)):
        if ref=='./': continue
        if not (ROOT/ref.lstrip('./')).exists(): fail(f'service worker missing asset {ref}')

# Secret-pattern guard: publishable keys are allowed; secret/service-role values are not.
secret_patterns=[re.compile(r'sb_secret_[A-Za-z0-9_-]{12,}'),re.compile(r'SUPABASE_SERVICE_ROLE_KEY\s*=\s*["\'][^"\']+["\']')]
for p in ROOT.rglob('*'):
    if not p.is_file() or '.git' in p.parts: continue
    try: text=p.read_text(errors='ignore')
    except Exception: continue
    for pat in secret_patterns:
        if pat.search(text): fail(f'possible backend secret in {p.relative_to(ROOT)}')

if errors:
    print('QA FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('QA PASSED')
print(' - JavaScript syntax')
print(' - Local HTML references')
print(' - PWA manifest')
print(' - Service-worker assets')
print(' - Secret-pattern guard')
