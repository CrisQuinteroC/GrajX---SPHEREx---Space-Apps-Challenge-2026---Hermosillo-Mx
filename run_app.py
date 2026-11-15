"""
CepheusLive — Lanzador Rápido del Servidor Local
Ejecuta: python run_app.py
Abre en el navegador: http://localhost:8000
"""

import sys
import webbrowser
import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("Iniciando CepheusLive — Visor SPHEREx NASA Space Apps Challenge 2026")
    print("URL Local: http://localhost:8000")
    print("=" * 60)
    
    # Iniciar servidor Uvicorn en localhost:8000
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
 