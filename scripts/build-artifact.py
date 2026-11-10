"""Build para el artefacto de Claude: mete las láminas dentro (p/*.webp) y deja index.html sin esqueleto.

Uso:  npm run build:artifact   ->  genera dist-artifact/
"""
import json, re, subprocess, os, sys, shutil, urllib.request, concurrent.futures as cf, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist-artifact'
LIMIT = {'featured': 12, 'other': 8}  # igual que ARTIFACT_LIMIT en src/data.ts
FEATURED = ['puertas', 'bestiario', 'mandalas', 'dioses']
CLD = 'https://res.cloudinary.com/dfhnrdobs/image/upload/f_webp,q_80,w_760/'

env = dict(os.environ, VITE_LOCAL_ASSETS='1')
subprocess.run(['npx', 'vite', 'build', '--outDir', str(OUT), '--emptyOutDir'], cwd=ROOT, env=env, check=True)

data = (ROOT / 'src/data.ts').read_text()
extra = json.loads((ROOT / 'src/pages.json').read_text())
ids = re.findall(r"id: '([a-z]+)'", data)
paths = []
for cid in ids:
    block = data.split(f"id: '{cid}'", 1)[1].split("\n  },\n", 1)[0]
    own = re.findall(r"path: '([^']+)'", block)
    allp = own + [p for p in extra.get(cid, []) if p not in own]
    paths += allp[: LIMIT['featured'] if cid in FEATURED else LIMIT['other']]

(OUT / 'p').mkdir(exist_ok=True)
def get(path):
    name = path.split('/')[-1].rsplit('.', 1)[0] + '.webp'
    dest = OUT / 'p' / name
    if not dest.exists():
        dest.write_bytes(urllib.request.urlopen(CLD + path, timeout=60).read())
    return dest.stat().st_size
total = sum(cf.ThreadPoolExecutor(12).map(get, paths))

html = (OUT / 'index.html').read_text()
head = re.search(r'<head>(.*)</head>', html, re.S).group(1)
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
head = re.sub(r'\s*<meta charset[^>]*>|\s*<meta name="viewport"[^>]*>', '', head)
head = re.sub(r'<title>.*?</title>', '<title>Escaparate Noctinta</title>', head)
(OUT / 'index.html').write_text(head.strip() + '\n' + body.strip() + '\n')
print(f'{len(paths)} láminas, {total/1e6:.1f} MB -> {OUT}')
