#!/usr/bin/env python3
"""POS Panadería — servidor mínimo con hledger como backend."""

import json
import os
import subprocess
import threading
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8077
DIR = os.path.dirname(os.path.abspath(__file__))
LEDGER = os.path.join(DIR, "panaderia.ledger")
CLIENTES = os.path.join(DIR, "clientes.csv")

write_lock = threading.Lock()


def hoy():
    return datetime.now().strftime("%Y-%m-%d")


def hora():
    return datetime.now().strftime("%H:%M")


def append_ledger(entry: str):
    with write_lock:
        with open(LEDGER, "a") as f:
            f.write("\n" + entry + "\n")


def cargar_clientes():
    clientes = {}
    if os.path.exists(CLIENTES):
        with open(CLIENTES) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split("|")
                if len(parts) >= 3:
                    clave, nombre, descuento = parts[0], parts[1], float(parts[2])
                    clientes[clave] = {"nombre": nombre, "descuento": descuento}
    return clientes


def hledger_bal(query: str) -> str:
    """Run hledger balance query and return the total."""
    try:
        r = subprocess.run(
            ["hledger", "-f", LEDGER, "balance"] + query.split() + ["-N", "--flat", "--no-total"],
            capture_output=True, text=True, timeout=10
        )
        # Extract just the amount from first line
        for line in r.stdout.strip().splitlines():
            line = line.strip()
            if line:
                return line.split("  ")[0].strip()
        return "$0"
    except Exception:
        return "?"


def hledger_bal_total(query_args: list) -> str:
    """Run hledger balance and return the total line."""
    try:
        r = subprocess.run(
            ["hledger", "-f", LEDGER, "balance"] + query_args + ["--depth", "1", "-N"],
            capture_output=True, text=True, timeout=10
        )
        # Grab first non-empty line which has the amount
        for line in r.stdout.strip().splitlines():
            stripped = line.strip()
            if stripped and ("$" in stripped):
                # Extract just the dollar amount
                parts = stripped.split()
                for p in parts:
                    if "$" in p:
                        return p
        return "$0"
    except Exception:
        return "?"


def get_status():
    """Get current balances for status bar."""
    caja = hledger_bal_total(["activos:caja"])
    inventario = hledger_bal_total(["activos:inventario"])
    cxc = hledger_bal_total(["activos:cuentas por cobrar"])
    return {"ok": True, "caja": caja, "inventario": inventario, "cxc": cxc}


def get_saldo_cliente(cliente_clave: str) -> str:
    clientes = cargar_clientes()
    c = clientes.get(cliente_clave, {"nombre": cliente_clave})
    cuenta = f"activos:cuentas por cobrar:{c['nombre'].lower()}"
    return hledger_bal_total([cuenta])


# === Asientos ===

def asiento_venta_mostrador(monto: float) -> str:
    return f"""{hoy()} Venta mostrador ({hora()})
    activos:caja                  ${monto:,.2f}
    activos:inventario:pan       ${-monto:,.2f}"""


def asiento_produccion(monto: float, nota: str = "") -> str:
    desc = f"Producción{' - ' + nota if nota else ''} ({hora()})"
    return f"""{hoy()} {desc}
    activos:inventario:pan        ${monto:,.2f}
    gastos:producción            ${-monto:,.2f}"""


def asiento_merma(monto: float, nota: str = "") -> str:
    desc = f"Merma{' - ' + nota if nota else ''} ({hora()})"
    return f"""{hoy()} {desc}
    gastos:mermas                 ${monto:,.2f}
    activos:inventario:pan       ${-monto:,.2f}"""


def asiento_venta_mayoreo(cliente_clave: str, monto: float) -> str:
    clientes = cargar_clientes()
    c = clientes.get(cliente_clave, {"nombre": cliente_clave, "descuento": 0})
    descuento = monto * (c["descuento"] / 100)
    cobrar = monto - descuento
    cuenta = f"activos:cuentas por cobrar:{c['nombre'].lower()}"

    lines = [f"{hoy()} Venta mayoreo - {c['nombre']} ({hora()})"]
    lines.append(f"    {cuenta}  ${cobrar:,.2f}")
    if descuento > 0:
        lines.append(f"    gastos:descuentos comerciales  ${descuento:,.2f}")
    lines.append(f"    activos:inventario:pan       ${-monto:,.2f}")
    return "\n".join(lines)


def asiento_cobro(cliente_clave: str, monto: float) -> str:
    clientes = cargar_clientes()
    c = clientes.get(cliente_clave, {"nombre": cliente_clave, "descuento": 0})
    cuenta = f"activos:cuentas por cobrar:{c['nombre'].lower()}"
    return f"""{hoy()} Cobro - {c['nombre']} ({hora()})
    activos:caja                  ${monto:,.2f}
    {cuenta}  ${-monto:,.2f}"""


def deshacer_asiento(asiento_original: str) -> str:
    """Genera un asiento reverso."""
    lines = asiento_original.strip().splitlines()
    if not lines:
        return ""
    # Primera línea: cambiar descripción
    header = lines[0]
    # Reemplazar la descripción para marcar como reverso
    new_lines = [f"{hoy()} REVERSO: {header.split(' ', 1)[1] if ' ' in header else header}"]
    for line in lines[1:]:
        stripped = line.strip()
        if not stripped:
            continue
        # Invertir el signo
        if "$-" in line:
            new_lines.append(line.replace("$-", "$"))
        elif "$" in line:
            new_lines.append(line.replace("$", "$-"))
    return "\n".join(new_lines)


def corte_caja():
    try:
        r = subprocess.run(
            ["hledger", "-f", LEDGER, "balance", "activos", "-p", "today", "--tree"],
            capture_output=True, text=True, timeout=10
        )
        resultado = r.stdout or "(sin movimientos hoy)"
    except FileNotFoundError:
        resultado = "(hledger no encontrado)"
    except Exception as e:
        resultado = f"Error: {e}"

    try:
        r2 = subprocess.run(
            ["hledger", "-f", LEDGER, "balance", "activos", "--tree"],
            capture_output=True, text=True, timeout=10
        )
        total = r2.stdout or ""
    except Exception:
        total = ""

    try:
        r3 = subprocess.run(
            ["hledger", "-f", LEDGER, "balance", "gastos", "-p", "today", "--tree"],
            capture_output=True, text=True, timeout=10
        )
        gastos = r3.stdout or ""
    except Exception:
        gastos = ""

    return f"=== CORTE DEL DÍA ({hoy()}) ===\n\nACTIVOS HOY:\n{resultado}\n\nGASTOS HOY:\n{gastos}\n=== SALDOS TOTALES ===\n\n{total}"


class POSHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            with open(os.path.join(DIR, "index.html"), "rb") as f:
                self.wfile.write(f.read())
        elif self.path == "/clientes":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(cargar_clientes()).encode())
        else:
            super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        resp = {"ok": False, "msg": ""}

        try:
            action = body.get("action", "")
            monto = float(body.get("monto", 0))
            nota = body.get("nota", "")
            cliente = body.get("cliente", "")

            if action == "status":
                resp = get_status()

            elif action == "saldo_cliente" and cliente:
                saldo = get_saldo_cliente(cliente)
                resp = {"ok": True, "saldo": saldo}

            elif action == "venta_mostrador" and monto > 0:
                entry = asiento_venta_mostrador(monto)
                append_ledger(entry)
                resp = {"ok": True, "msg": f"✅ Venta mostrador ${monto:,.2f}", "asiento": entry}

            elif action == "produccion" and monto > 0:
                entry = asiento_produccion(monto, nota)
                append_ledger(entry)
                resp = {"ok": True, "msg": f"✅ Producción ${monto:,.2f}", "asiento": entry}

            elif action == "merma" and monto > 0:
                entry = asiento_merma(monto, nota)
                append_ledger(entry)
                resp = {"ok": True, "msg": f"✅ Merma ${monto:,.2f}", "asiento": entry}

            elif action == "venta_mayoreo" and monto > 0 and cliente:
                entry = asiento_venta_mayoreo(cliente, monto)
                append_ledger(entry)
                clientes = cargar_clientes()
                c = clientes.get(cliente, {"nombre": cliente})
                resp = {"ok": True, "msg": f"✅ Venta mayoreo {c['nombre']} ${monto:,.2f}", "asiento": entry}

            elif action == "cobro" and monto > 0 and cliente:
                entry = asiento_cobro(cliente, monto)
                append_ledger(entry)
                clientes = cargar_clientes()
                c = clientes.get(cliente, {"nombre": cliente})
                resp = {"ok": True, "msg": f"✅ Cobro {c['nombre']} ${monto:,.2f}", "asiento": entry}

            elif action == "corte":
                resp = {"ok": True, "msg": corte_caja()}

            elif action == "deshacer":
                asiento_orig = body.get("asiento", "")
                if asiento_orig:
                    reverso = deshacer_asiento(asiento_orig)
                    append_ledger(reverso)
                    resp = {"ok": True, "msg": "↩ Transacción revertida"}
                else:
                    resp = {"ok": False, "msg": "❌ Sin asiento para revertir"}

            else:
                resp = {"ok": False, "msg": "❌ Acción inválida o datos faltantes"}

        except Exception as e:
            resp = {"ok": False, "msg": f"❌ Error: {e}"}

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(resp).encode())

    def log_message(self, format, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]}")


if __name__ == "__main__":
    os.chdir(DIR)
    if not os.path.exists(LEDGER):
        with open(LEDGER, "w") as f:
            f.write("; POS Panadería — Ledger principal\n")
    if not os.path.exists(CLIENTES):
        with open(CLIENTES, "w") as f:
            f.write("# clave|nombre|descuento_%\n")
            f.write("don_pepe|Don Pepe|10\n")
            f.write("la_tiendita|La Tiendita|15\n")

    server = HTTPServer(("0.0.0.0", PORT), POSHandler)
    print(f"🍞 POS Panadería corriendo en http://localhost:{PORT}")
    print(f"📒 Ledger: {LEDGER}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido")
