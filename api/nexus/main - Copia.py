"""
============================================================
 NJK DYNAMICS — NEXUS
 Arquivo: api/nexus/main.py
<<<<<<< HEAD
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
=======
 Servico: NJK Nexus API — Core do Ecossistema v1.2.0
============================================================
 ENDPOINTS:
   GET    /health
   GET    /api/stats | /api/stats/dataware | /api/stats/agroata | /api/stats/finalyze
   POST   /api/clientes
   GET    /api/clientes
   GET    /api/clientes/{id}
   PATCH  /api/clientes/{id}/status
   DELETE /api/clientes/{id}
>>>>>>> 3a7493168a63a1c9ad7395f950cf632953428523
============================================================
"""

import os
import asyncio
import httpx
from datetime import datetime
from typing import Optional

<<<<<<< HEAD
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
=======
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
>>>>>>> 3a7493168a63a1c9ad7395f950cf632953428523
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")
<<<<<<< HEAD

# URLs dos outros serviços — preencher quando subirem no Render
DATAWARE_API_URL: str = os.environ.get("DATAWARE_API_URL", "https://njk-api.onrender.com")
=======
>>>>>>> 3a7493168a63a1c9ad7395f950cf632953428523
AGROATA_API_URL:  str = os.environ.get("AGROATA_API_URL", "")
FINALYZE_API_URL: str = os.environ.get("FINALYZE_API_URL", "")

if not SUPABASE_URL or not SUPABASE_KEY:
<<<<<<< HEAD
    raise EnvironmentError(
        "Credenciais Supabase não configuradas.\n"
        "Adicione SUPABASE_URL e SUPABASE_KEY nas variáveis de ambiente do Render."
    )
=======
    raise EnvironmentError("Credenciais Supabase não configuradas.")
>>>>>>> 3a7493168a63a1c9ad7395f950cf632953428523

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(
    title="NJK Nexus API",
<<<<<<< HEAD
    description="API central do ecossistema NJK Dynamics. Agrega health e stats de todos os módulos.",
    version="1.1.0",
=======
    description="API central do ecossistema NJK Dynamics.",
    version="1.2.0",
>>>>>>> 3a7493168a63a1c9ad7395f950cf632953428523
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
<<<<<<< HEAD
    allow_origins=["*"],  # Produção: substituir por ["https://njkdynamics.vercel.app"]
=======
    allow_origins=["*"],
>>>>>>> 3a7493168a63a1c9ad7395f950cf632953428523
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< HEAD

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
=======
# ── SCHEMAS ────────────────────────────────────
STATUS_VALIDOS = {"ativo", "inativo", "suspenso"}

class ClienteCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=200)
    status: Optional[str] = Field("ativo")

    @field_validator("nome")
    @classmethod
    def nome_nao_vazio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("O nome não pode ser vazio.")
        return v.strip()

    @field_validator("status")
    @classmethod
    def status_valido(cls, v: str) -> str:
        if v not in STATUS_VALIDOS:
            raise ValueError(f"Status inválido. Use: {', '.join(STATUS_VALIDOS)}")
        return v

class ClienteStatusUpdate(BaseModel):
    status: str = Field(...)

    @field_validator("status")
    @classmethod
    def status_valido(cls, v: str) -> str:
        if v not in STATUS_VALIDOS:
            raise ValueError(f"Status inválido. Use: {', '.join(STATUS_VALIDOS)}")
        return v

# ── HELPERS ────────────────────────────────────

async def count_clientes(status: str) -> int:
    try:
        result = (
            supabase.table("dim_clientes")
            .select("id")
            .eq("status", status)
            .execute()
        )
        return len(result.data)
    except Exception:
        return -1

async def fetch_modulo_stats(url: str, path: str) -> Optional[dict]:
>>>>>>> 3a7493168a63a1c9ad7395f950cf632953428523
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

<<<<<<< HEAD

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
=======
# ── SISTEMA ────────────────────────────────────

@app.get("/health", tags=["Sistema"])
async def health_check():
    return {"status": "online", "servico": "NJK Nexus API", "versao": "1.2.0", "timestamp": datetime.utcnow().isoformat() + "Z"}

# ── CLIENTES CRUD ──────────────────────────────

@app.post("/api/clientes", status_code=201, tags=["Clientes"])
async def criar_cliente(payload: ClienteCreate):
    try:
        resultado = supabase.table("dim_clientes").insert({"nome": payload.nome, "status": payload.status}).execute()
        if resultado.data:
            return {"sucesso": True, "mensagem": "Cliente cadastrado com sucesso.", "cliente": resultado.data[0]}
        raise HTTPException(status_code=500, detail="Erro ao inserir cliente.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.get("/api/clientes", tags=["Clientes"])
async def listar_clientes(
    status: Optional[str] = Query(None),
    limite: int = Query(100, ge=1, le=9999),
    pagina: int = Query(1, ge=1),
):
    try:
        query = supabase.table("dim_clientes").select("*")
        filtro_status = status if status else "ativo"
        if filtro_status in STATUS_VALIDOS:
            query = query.eq("status", filtro_status)
        offset = (pagina - 1) * limite
        query = query.order("id", desc=False).range(offset, offset + limite - 1)
        resultado = query.execute()
        return {"sucesso": True, "total": len(resultado.data), "pagina": pagina, "limite": limite, "filtro_status": filtro_status, "clientes": resultado.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar clientes: {str(e)}")

@app.get("/api/clientes/{cliente_id}", tags=["Clientes"])
async def buscar_cliente(cliente_id: int):
    try:
        resultado = supabase.table("dim_clientes").select("*").eq("id", cliente_id).single().execute()
        if resultado.data:
            return {"sucesso": True, "cliente": resultado.data}
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.patch("/api/clientes/{cliente_id}/status", tags=["Clientes"])
async def atualizar_status_cliente(cliente_id: int, payload: ClienteStatusUpdate):
    try:
        resultado = supabase.table("dim_clientes").update({"status": payload.status}).eq("id", cliente_id).execute()
        if resultado.data:
            return {"sucesso": True, "mensagem": f"Status atualizado para '{payload.status}'.", "cliente": resultado.data[0]}
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.delete("/api/clientes/{cliente_id}", tags=["Clientes"])
async def excluir_cliente(cliente_id: int):
    try:
        resultado = supabase.table("dim_clientes").delete().eq("id", cliente_id).execute()
        if resultado.data:
            return {"sucesso": True, "mensagem": f"Cliente #{cliente_id} removido com sucesso."}
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao excluir: {str(e)}")

# ── STATS ──────────────────────────────────────

@app.get("/api/stats/dataware", tags=["Stats"])
async def stats_dataware():
    try:
        rA = supabase.table("dim_clientes").select("id").eq("status", "ativo").execute()
        rI = supabase.table("dim_clientes").select("id").eq("status", "inativo").execute()
        rS = supabase.table("dim_clientes").select("id").eq("status", "suspenso").execute()
        ativos    = len(rA.data) if rA.data else 0
        inativos  = len(rI.data) if rI.data else 0
        suspensos = len(rS.data) if rS.data else 0
        total = ativos + inativos + suspensos
        return {
            "sucesso": True,
            "total": total,
            "ativos": ativos,
            "inativos": inativos,
            "suspensos": suspensos,
            "outros": inativos + suspensos,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        return {"sucesso": False, "total": 0, "ativos": 0, "inativos": 0, "suspensos": 0, "outros": 0}

@app.get("/api/stats/agroata", tags=["Stats"])
async def stats_agroata():
    if not AGROATA_API_URL:
        return {"sucesso": False, "disponivel": False, "mensagem": "AgroAta API não configurada.", "total": None, "produtores": None, "mes": None}
    dados = await fetch_modulo_stats(AGROATA_API_URL, "/api/atas/stats")
    if dados:
        return {"sucesso": True, "disponivel": True, "total": dados.get("total"), "produtores": dados.get("produtores"), "mes": dados.get("mes"), "timestamp": datetime.utcnow().isoformat() + "Z"}
    return {"sucesso": False, "disponivel": True, "mensagem": "AgroAta API indisponível.", "total": None, "produtores": None, "mes": None}

@app.get("/api/stats/finalyze", tags=["Stats"])
async def stats_finalyze():
    if not FINALYZE_API_URL:
        return {"sucesso": False, "disponivel": False, "mensagem": "Finalyze API não configurada.", "contratos": None, "pdfs": None, "relatorios": None}
    dados = await fetch_modulo_stats(FINALYZE_API_URL, "/api/contratos/stats")
    if dados:
        return {"sucesso": True, "disponivel": True, "contratos": dados.get("contratos"), "pdfs": dados.get("pdfs"), "relatorios": dados.get("relatorios"), "timestamp": datetime.utcnow().isoformat() + "Z"}
    return {"sucesso": False, "disponivel": True, "mensagem": "Finalyze API indisponível.", "contratos": None, "pdfs": None, "relatorios": None}

@app.get("/api/stats", tags=["Stats"])
async def stats_completas():
    dataware, agroata, finalyze = await asyncio.gather(stats_dataware(), stats_agroata(), stats_finalyze())
    return {"sucesso": True, "timestamp": datetime.utcnow().isoformat() + "Z", "modulos": {"dataware": dataware, "agroata": agroata, "finalyze": finalyze}}
>>>>>>> 3a7493168a63a1c9ad7395f950cf632953428523
