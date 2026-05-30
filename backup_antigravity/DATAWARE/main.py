"""
============================================================
 NJK DYNAMICS -- DATAWARE
 Arquivo: main.py
 Servico: NJK Core API -- Dimensao de Clientes
============================================================

 COMO RODAR:
   uvicorn main:app --reload --port 8000

 ENDPOINTS:
   POST   /api/clientes              -> Adicionar novo cliente
   GET    /api/clientes              -> Listar clientes (filtro por status)
   GET    /api/clientes/{id}         -> Buscar cliente por ID
   PATCH  /api/clientes/{id}/status  -> Atualizar status
   DELETE /api/clientes/{id}         -> Remover cliente
   GET    /health                    -> Health check da API
============================================================
"""

import os
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from supabase import create_client, Client
from dotenv import load_dotenv

# -- Variaveis de Ambiente
load_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "Credenciais Supabase nao configuradas.\n"
        "Copie .env.example para .env e preencha SUPABASE_URL e SUPABASE_KEY."
    )

# -- Cliente Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -- Aplicacao FastAPI
app = FastAPI(
    title="NJK Core API - DATAWARE",
    description="Nucleo central de dados da NJK Dynamics. Gerenciamento de dimensoes.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# -- CORS: permite o frontend local acessar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
#  SCHEMAS (Pydantic)
# ============================================================

STATUS_VALIDOS = {"ativo", "inativo", "suspenso"}


class ClienteCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=200, description="Nome do cliente")
    status: Optional[str] = Field("ativo", description="Status: ativo | inativo | suspenso")

    @field_validator("nome")
    @classmethod
    def nome_nao_vazio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("O nome nao pode ser vazio ou apenas espacos.")
        return v.strip()

    @field_validator("status")
    @classmethod
    def status_valido(cls, v: str) -> str:
        if v not in STATUS_VALIDOS:
            raise ValueError(f"Status invalido. Use: {', '.join(STATUS_VALIDOS)}")
        return v


class ClienteStatusUpdate(BaseModel):
    status: str = Field(..., description="Novo status: ativo | inativo | suspenso")

    @field_validator("status")
    @classmethod
    def status_valido(cls, v: str) -> str:
        if v not in STATUS_VALIDOS:
            raise ValueError(f"Status invalido. Use: {', '.join(STATUS_VALIDOS)}")
        return v


# ============================================================
#  ENDPOINTS
# ============================================================

@app.get("/health", tags=["Sistema"])
async def health_check():
    """Verifica se a API esta online."""
    return {
        "status": "online",
        "servico": "NJK Core API",
        "modulo": "dim_clientes",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.post("/api/clientes", status_code=201, tags=["Clientes"])
async def criar_cliente(payload: ClienteCreate):
    """Adiciona um novo cliente a dimensao dim_clientes. O ID e gerado automaticamente (sequencial)."""
    try:
        resultado = (
            supabase.table("dim_clientes")
            .insert({"nome": payload.nome, "status": payload.status})
            .execute()
        )
        if resultado.data:
            return {
                "sucesso": True,
                "mensagem": "Cliente cadastrado com sucesso.",
                "cliente": resultado.data[0],
            }
        raise HTTPException(status_code=500, detail="Erro ao inserir cliente.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@app.get("/api/clientes", tags=["Clientes"])
async def listar_clientes(
    status: Optional[str] = Query(None, description="Filtrar por status (ativo/inativo/suspenso)"),
    limite: int = Query(100, ge=1, le=500, description="Maximo de registros retornados"),
    pagina: int = Query(1, ge=1, description="Numero da pagina"),
):
    """
    Lista clientes da dimensao. Por padrao retorna apenas clientes ativos.
    Use ?status=inativo ou ?status=suspenso para outros status.
    """
    try:
        query = supabase.table("dim_clientes").select("*")

        filtro_status = status if status else "ativo"
        if filtro_status in STATUS_VALIDOS:
            query = query.eq("status", filtro_status)

        offset = (pagina - 1) * limite
        # Ordena por ID crescente para manter ordem sequencial natural
        query = query.order("id", desc=False).range(offset, offset + limite - 1)

        resultado = query.execute()

        return {
            "sucesso": True,
            "total": len(resultado.data),
            "pagina": pagina,
            "limite": limite,
            "filtro_status": filtro_status,
            "clientes": resultado.data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar clientes: {str(e)}")


@app.get("/api/clientes/{cliente_id}", tags=["Clientes"])
async def buscar_cliente(cliente_id: int):
    """Busca um cliente especifico pelo ID sequencial."""
    try:
        resultado = (
            supabase.table("dim_clientes")
            .select("*")
            .eq("id", cliente_id)
            .single()
            .execute()
        )
        if resultado.data:
            return {"sucesso": True, "cliente": resultado.data}
        raise HTTPException(status_code=404, detail="Cliente nao encontrado.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@app.patch("/api/clientes/{cliente_id}/status", tags=["Clientes"])
async def atualizar_status_cliente(cliente_id: int, payload: ClienteStatusUpdate):
    """Atualiza o status de um cliente (ativo | inativo | suspenso)."""
    try:
        resultado = (
            supabase.table("dim_clientes")
            .update({"status": payload.status})
            .eq("id", cliente_id)
            .execute()
        )
        if resultado.data:
            return {
                "sucesso": True,
                "mensagem": f"Status atualizado para '{payload.status}'.",
                "cliente": resultado.data[0],
            }
        raise HTTPException(status_code=404, detail="Cliente nao encontrado.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@app.delete("/api/clientes/{cliente_id}", tags=["Clientes"])
async def excluir_cliente(cliente_id: int):
    """Remove permanentemente um cliente pelo ID sequencial."""
    try:
        resultado = (
            supabase.table("dim_clientes")
            .delete()
            .eq("id", cliente_id)
            .execute()
        )
        if resultado.data:
            return {
                "sucesso": True,
                "mensagem": f"Cliente #{cliente_id} removido com sucesso.",
            }
        raise HTTPException(status_code=404, detail="Cliente nao encontrado.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao excluir: {str(e)}")