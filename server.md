---
id: 202602121441
categories: "[[BOS]]"
---

# Server Unificado

Servidor Node.js que sirve todas las apps de `archivos/herramientas/` bajo un solo puerto.

## Puerto

**8080** — `http://localhost:8080`

## Rutas

| Ruta | App |
|------|-----|
| `/` | Índice de herramientas |
| `/timer` | Timer visual |
| `/pos` | POS Panadería |
| `/taskwarrior` | Taskwarrior Web UI |
| `/api/tasks` | API REST de Taskwarrior (GET/POST/PUT/DELETE) |

## Cómo correr

```bash
cd archivos/herramientas
node server.js
```

## Stack

- Node.js (http nativo, sin dependencias externas)
- Sirve archivos estáticos + APIs
- Taskwarrior integration via `task` CLI

## Notas

- Cuando se agregue una app nueva, agregar su ruta en server.js
- No necesita npm install — cero dependencias
