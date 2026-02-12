---
id: 202602121440
categories: "[[BOS]]"
---

# POS Panadería 🍞

Punto de venta para panadería. Registro de ventas, clientes, y contabilidad integrada con ledger.

## Archivos

| Archivo | Función |
|---------|---------|
| `index.html` | UI del POS (HTML/JS) |
| `server.py` | Backend Python — API + servidor |
| `clientes.csv` | Base de datos de clientes |
| `panaderia.ledger` | Libro contable de la panadería |

## Cómo correr

```bash
# Server propio
cd archivos/herramientas/pos-panaderia
python3 server.py  # Puerto 8077

# O via server.js unificado
node server.js  # Puerto 8080, ruta /pos
```

## Stack

- Frontend: HTML + CSS + JS vanilla
- Backend: Python 3 (http.server)
- Datos: CSV + ledger (plain text)
