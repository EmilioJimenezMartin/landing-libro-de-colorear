#!/usr/bin/env bash
# Publica dist/ en la rama gh-pages SIN borrar los assets de versiones anteriores:
# GitHub Pages guarda el index.html en caché 10 min y, si faltan sus assets, la web se queda en blanco.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
W=$(mktemp -d)
git worktree add -q "$W" gh-pages 2>/dev/null || { git fetch -q origin gh-pages:gh-pages; git worktree add -q "$W" gh-pages; }
cp -R dist/. "$W"/
touch "$W/.nojekyll"
(cd "$W" && git add -A && git commit -qm "Despliegue $(date '+%Y-%m-%d %H:%M')" && git push -q origin gh-pages) || true
git worktree remove --force "$W"
echo "Publicado: https://emiliojimenezmartin.github.io/landing-libro-de-colorear/"
