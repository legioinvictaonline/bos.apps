# Obra en vivo

Dashboard estático para ver en una sola pantalla las cámaras/streams de obra de:

- Ciudad de México
- San José del Cabo

## Ruta

- Local/server: `http://localhost:8080/obra`
- GitHub Pages: `/obra-live/`

## Uso

Pega en cada tarjeta la URL pública o accesible desde el dispositivo:

- página/iframe del proveedor
- imagen o MJPEG
- video MP4/HLS

La configuración se guarda en `localStorage` del navegador. También puede compartirse con parámetros:

```text
?cdmx=https://...&sjc=https://...
```

## Nota

Si la cámara está en red privada, el sitio público puede abrir, pero el video solo se verá desde la misma red o VPN.
