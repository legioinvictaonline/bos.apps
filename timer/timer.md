---
id: 202602081243
---

# Timer Visual (Time Timer)

## Qué es
Timer visual tipo Time Timer — círculo de color que se va vaciando conforme pasa el tiempo. Para bloques de trabajo, pomodoro, o lo que sea.

## Archivos

| Archivo | Ubicación | Función |
|---------|-----------|---------|
| timer.html | `archivos/herramientas/timer.html` | La app (HTML/JS puro, abre en cualquier navegador) |
| app.icns | `~/Applications/Brave Browser Apps.localized/Timer.app/Contents/Resources/app.icns` | Ícono personalizado (círculo rojo) |
| Timer.app | `~/Applications/Brave Browser Apps.localized/Timer.app` | Brave Web App (acceso directo) |

## Cómo abrir
- **Mac:** doble clic en Timer.app o abrir timer.html en cualquier navegador
- **iPhone/iPad:** app Archivos → vault → `archivos/herramientas/timer.html` → Compartir → Abrir en Safari
- **Red local:** levantar servidor con `python3 -m http.server 8090` desde la carpeta y abrir `http://<IP>:8090/timer.html`

## Controles
- **Start/Pause:** clic en botón o barra espaciadora
- **Reset:** clic en botón o tecla R
- **Presets:** 5, 10, 15, 20, 25, 30, 45, 60 minutos
- **Custom:** escribir minutos en el input y dar Set
- **Al terminar:** flash rojo + sonido

## Código
- HTML + CSS + JS vanilla, cero dependencias
- Canvas 2D para el círculo animado
- Título de la pestaña muestra el tiempo restante
- Dark theme (#1a1a1a)
- Color del timer: #e74c3c (rojo)

## Ícono
- Generado con Python (círculo rojo 75% lleno, fondo oscuro, 512x512)
- Convertido a .icns con iconutil de macOS
- Si cambia el ícono de la app: reemplazar `app.icns` y hacer `touch` sobre el .app

## Mantenimiento
- Para cambiar colores: editar variables `timerColor` y `bgRing` en timer.html
- Para agregar sonido: reemplazar el data URI del `new Audio()` al final
- Para cambiar presets: editar los botones en el HTML
- El timer es un archivo estático — no necesita servidor, no necesita internet
