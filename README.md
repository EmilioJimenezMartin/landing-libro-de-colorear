# NOCTINTA · web escaparate

Escaparate de los libros de colorear que genera el gestor de tareas (`emi-gestor-de-tareas`).

- **Libro 3D** que se abre con el scroll; cada página se colorea sola (relleno automático por regiones en canvas).
- **Estantería** con las 4 colecciones y botón a Amazon.
- **Estudio** para colorear online: toque para rellenar, "Colorear por mí", deshacer, descargar PNG, imprimir.
- **Láminas gratis** para descargar.

## Arrancar

```bash
npm install
npm run dev
```

## Lo que falta rellenar

- `src/data.ts` → `amazonUrl` de cada colección (ahora apunta a una búsqueda en amazon.es). Pon la ficha real: `https://www.amazon.es/dp/ASIN`.
- Títulos, textos y número de láminas de cada colección, en el mismo archivo.
- Las imágenes salen de Cloudinary (`dfhnrdobs`). Para cambiar láminas, cambia los `path`.

## Publicar

`npm run build` genera `dist/`, que se puede subir a Vercel, Netlify o a Dokploy como web estática.
