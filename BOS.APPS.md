---
id: 202602121439
categories: "[[BOS]]"
---

# BOS.APPS — Índice de Apps

> **BOS** = Business Operating System — la rama tecnológica de Legio Invicta.
> Todas las mini apps viven en `archivos/herramientas/` y se sirven con `server.js`.

## Apps

### 🕐 Timer
- **Carpeta:** `timer/`
- **Puerto:** estático (servido por `server.js` en :8080/timer)
- **Qué es:** Timer visual tipo Time Timer — círculo rojo que se vacía. Para bloques de trabajo, pomodoro.
- **Stack:** HTML + CSS + JS vanilla, cero dependencias
- **PWA:** Sí — Brave Web App con ícono personalizado
- **Nota:** `timer/timer.md`

### 🍞 POS Panadería
- **Carpeta:** `pos-panaderia/`
- **Puerto:** 8077 (server.py propio) o :8080/pos (via server.js)
- **Qué es:** Punto de venta para panadería. Clientes, ventas, ledger integrado.
- **Stack:** HTML + Python (server.py) + ledger
- **Datos:** `clientes.csv`, `panaderia.ledger`
- **Nota:** `pos-panaderia/README.md`

### 📅 Calendario Semana
- **Carpeta:** `calendario-semana/`
- **Puerto:** estático (servido por server.js)
- **Qué es:** Calendario visual semanal con bloques de colores para Cristina. Horarios de Rise Sleep, línea roja de hora actual.
- **Stack:** HTML + CSS + JS vanilla
- **Nota:** `calendario-semana/README.md`

### 🕰️ Hora en vivo
- **Carpeta:** `obra-live/`
- **Puerto:** estático (servido por `server.js` en :8080/obra)
- **Qué es:** Pantalla con dos relojes grandes para ver en tiempo real la hora de Ciudad de México y San José del Cabo.
- **Stack:** HTML + CSS + JS vanilla, cero dependencias
- **Nota:** `obra-live/README.md`

## Servidor Unificado

- **Archivo:** `server.js`
- **Puerto:** 8080
- **Rutas:** `/timer`, `/pos`, `/calendario`, `/obra`, `/taskwarrior`, `/api/tasks`
- **Cómo correr:** `node server.js` desde `archivos/herramientas/`
- **Nota:** `server.md`

## Convenciones

- Cada app → su propia carpeta con `index.html` como entrada
- Cada app → un README.md o nota `.md` documentando qué es, cómo correr, stack
- Server.js las sirve todas bajo rutas limpias
- Git para versionar: `git init` en esta carpeta
- Archivos estáticos no necesitan servidor propio — server.js los sirve

### 🎵 Navidrome
- **Carpeta:** `navidrome/`
- **Puerto:** 4533
- **Qué es:** Servidor de música personal. Subsonic API.
- **Stack:** Navidrome + Subsonic API
- **Operación:** `navidrome/operacion/` — 3 bibliotecas (personal, playlists, mixes)
- **Nota:** `navidrome/README.md`

## Convención: carpeta `operacion/`

Cada app puede tener una subcarpeta `operacion/` con la documentación de **cómo se opera** — flujos, datos, decisiones del día a día. Separada del código/desarrollo.

```
app/
├── README.md          # qué es, stack, cómo correr
├── operacion/         # cómo la opero yo
│   └── README.md
├── index.html         # código
└── ...
```

## Apps futuras

<!-- Agregar aquí conforme se creen nuevas apps -->
