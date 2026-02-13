---
id: 202602121938
categories: "[[BOS]]"
---

# Navidrome — Operación

## Bibliotecas

1. **Personal** — `archivos/música/Music/` (dentro del vault)
2. **YouTube** — descargas con yt-dlp (pendiente separar)
3. **Compartida** — (pendiente, plan Sonos)

## Flujo para agregar música

1. Descargar: `yt-dlp -x --audio-format mp3 URL`
2. Tags ID3: `id3v2 -a "Artista" -A "Álbum" -t "Título" -y AÑO -g "Género" archivo.mp3`
3. Mover a `archivos/música/Music/Artista/Álbum/Título.mp3`
4. Scan: automático o forzar con curl a `/rest/startScan`

## Playlists

- Por mood (pendiente)
- Creación via API o UI web

## ReplayGain

- Activado en UI: Mode=Track, Preamp=0 dB
- Normaliza volumen al vuelo SIN modificar archivos
