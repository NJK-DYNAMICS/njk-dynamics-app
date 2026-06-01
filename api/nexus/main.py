"""
============================================================
 NJK DYNAMICS — NEXUS
 Arquivo: api/nexus/main.py
 Servico: NJK Nexus API — Agregador Central do Ecossistema
============================================================

 COMO RODAR LOCALMENTE:
   uvicorn main:app --reload --port 8001

 RENDER:
   - Root Directory: api/nexus
   - Build Command: pip install -r requirements.txt
   - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT

 ENDPOINTS:
   GET  /health                 -> Health check
   GET  /api/stats              -> Stats agregadas de todos os módulos
   GET  /api/stats/dataware     -> Stats do Dataware (dim_clientes)
   GET  /api/stats/agroata      -> Stats do AgroAta
   GET  /api/stats/finalyze     -> Stats do Finalyze
============================================================
"""

import os
import asyncio
import httpx
from datetime import datetime
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")

# URLs dos outros serviços — preencher quando subirem no Render
DATAWARE_API_URL: str = os.environ.get("DATAWARE_API_URL", "https://njk-api.onrender.com")
AGROATA_API_URL:  str = os.environ.get("AGROATA_API_URL", "")
FINALYZE_API_URL: str = os.environ.get("FINALYZE_API_URL", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "Credenciais Supabase não configuradas.\n"
        "Adicione SUPABASE_URL e SUPABASE_KEY nas variáveis de ambiente do Render."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(
    title="NJK Nexus API",
    description="API central do ecossistema NJK Dynamics. Agrega health e stats de todos os módulos.",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Produção: substituir por ["https://njkdynamics.vercel.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────

async def count_clientes(status: str) -> int:
    """Conta clientes por status direto no Supabase (1 query eficiente)."""
    try:
        result = (
            supabase.table("dim_clientes")
            .select("id", count="exact")
            .eq("status", status)
            .execute()
        )
        return result.count or 0
    except Exception:
        return -1


async def fetch_modulo_stats(url: str, path: str) -> Optional[dict]:
    """Busca stats de um módulo externo via HTTP."""
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{url.rstrip('/')}{path}")
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return None


# ──────────────────────────────────────────────
#  ENDPOINTS
# ──────────────────────────────────────────────

@app.get("/health", tags=["Sistema"])
async def health_check():
    """
    Health check do NEXUS API.
    Consumido pelo portal a cada 30s para exibir o status na topbar.
    """
    return {
        "status": "online",
        "servico": "NJK Nexus API",
        "versao": "1.1.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/stats/dataware", tags=["Stats"])
async def stats_dataware():
    """
    Retorna contagens da dim_clientes do Supabase.
    Consumido pelo card Dataware no portal NEXUS.
    """
    ativos, inativos, suspensos = await asyncio.gather(
        count_clientes("ativo"),
        count_clientes("inativo"),
        count_clientes("suspenso"),
    )

    erro = any(v == -1 for v in [ativos, inativos, suspensos])
    total = max(ativos, 0) + max(inativos, 0) + max(suspensos, 0)

    return {
        "sucesso": not erro,
        "total":    total,
        "ativos":   ativos,
        "inativos": inativos,
        "suspensos": suspensos,
        "outros":   max(inativos, 0) + max(suspensos, 0),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/stats/agroata", tags=["Stats"])
async def stats_agroata():
    """
    Retorna stats do AgroAta.
    Consumido pelo card AgroAta no portal NEXUS.
    Endpoint do AgroAta: GET /api/atas/stats → { total, produtores, mes }
    """
    if not AGROATA_API_URL:
        return {
            "sucesso": False,
            "disponivel": False,
            "mensagem": "AgroAta API não configurada (AGROATA_API_URL vazio).",
            "total": None, "produtores": None, "mes": None,
        }

    dados = await fetch_modulo_stats(AGROATA_API_URL, "/api/atas/stats")
    if dados:
        return {
            "sucesso": True,
            "disponivel": True,
            "total":      dados.get("total"),
            "produtores": dados.get("produtores"),
            "mes":        dados.get("mes"),
            "timestamp":  datetime.utcnow().isoformat() + "Z",
        }

    return {
        "sucesso": False,
        "disponivel": True,
        "mensagem": "AgroAta API indisponível no momento.",
        "total": None, "produtores": None, "mes": None,
    }


@app.get("/api/stats/finalyze", tags=["Stats"])
async def stats_finalyze():
    """
    Retorna stats do Finalyze.
    Consumido pelo card Finalyze no portal NEXUS.
    Endpoint do Finalyze: GET /api/contratos/stats → { contratos, pdfs, relatorios }
    """
    if not FINALYZE_API_URL:
        return {
            "sucesso": False,
            "disponivel": False,
            "mensagem": "Finalyze API não configurada (FINALYZE_API_URL vazio).",
            "contratos": None, "pdfs": None, "relatorios": None,
        }

    dados = await fetch_modulo_stats(FINALYZE_API_URL, "/api/contratos/stats")
    if dados:
        return {
            "sucesso": True,
            "disponivel": True,
            "contratos":  dados.get("contratos"),
            "pdfs":       dados.get("pdfs"),
            "relatorios": dados.get("relatorios"),
            "timestamp":  datetime.utcnow().isoformat() + "Z",
        }

    return {
        "sucesso": False,
        "disponivel": True,
        "mensagem": "Finalyze API indisponível no momento.",
        "contratos": None, "pdfs": None, "relatorios": None,
    }


@app.get("/api/stats", tags=["Stats"])
async def stats_completas():
    """
    Agrega stats de todos os módulos em uma única chamada.
    Útil para um único fetch no portal em vez de 3 separados.
    """
    dataware, agroata, finalyze = await asyncio.gather(
        stats_dataware(),
        stats_agroata(),
        stats_finalyze(),
    )

    return {
        "sucesso": True,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "modulos": {
            "dataware": dataware,
            "agroata":  agroata,
            "finalyze": finalyze,
        }
    }
