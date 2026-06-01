"""
============================================================
 NJK DYNAMICS — NEXUS
 Arquivo: api/nexus/main.py
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
============================================================
"""

import os
import asyncio
import httpx
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")
AGROATA_API_URL:  str = os.environ.get("AGROATA_API_URL", "")
FINALYZE_API_URL: str = os.environ.get("FINALYZE_API_URL", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError("Credenciais Supabase não configuradas.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(
    title="NJK Nexus API",
    description="API central do ecossistema NJK Dynamics.",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    limite: int = Query(100, ge=1, le=500),
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
