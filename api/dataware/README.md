# NJK DATAWARE — Guia de Instalacao e Execucao

## Estrutura do Projeto

```
api/dataware/            # Backend (este diretório — Root Directory no Render)
|-- main.py              # NJK Core API (FastAPI)
|-- setup_supabase.py    # Script de setup da tabela no Supabase
|-- requirements.txt     # Dependencias Python
|-- .env.example         # Template de variaveis de ambiente

apps/dataware/           # Painel Administrativo (frontend — deploy Vercel)
```

---

## PASSO 1 — Configurar Supabase

### 1a. Criar o arquivo .env

Copie o arquivo `.env.example` para `.env` e preencha suas credenciais:

```env
SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
SUPABASE_KEY=SUA_ANON_KEY_AQUI
```

Voce encontra essas informacoes no painel do Supabase:
- **Project Settings** > **API** > **Project URL**
- **Project Settings** > **API** > **Project API Keys** > `anon public`

### 1b. Criar a tabela dim_clientes

**Opcao A (Recomendada):** Cole o SQL abaixo diretamente no **SQL Editor** do Supabase Dashboard:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS dim_clientes (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome          TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo', 'inativo', 'suspenso')),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON dim_clientes;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON dim_clientes
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

ALTER TABLE dim_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access"
ON dim_clientes FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Politica para anon (necessario para a API funcionar com anon key)
CREATE POLICY "anon_full_access"
ON dim_clientes FOR ALL TO anon
USING (true) WITH CHECK (true);
```

**Opcao B:** Execute o script Python (requer RPC habilitado no Supabase):
```bash
python setup_supabase.py
```

---

## PASSO 2 — Instalar Dependencias Python

```bash
pip install fastapi==0.111.0 uvicorn[standard]==0.29.0 supabase==2.5.0 python-dotenv==1.0.1 pydantic==2.7.1
```

Ou instale pelo arquivo requirements.txt:
```bash
pip install -r requirements.txt
```

---

## PASSO 3 — Rodar o Servidor (API)

```bash
uvicorn main:app --reload --port 8000
```

A API estara disponivel em: `http://localhost:8000`

- **Documentacao interativa (Swagger):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

---

## PASSO 4 — Abrir o Painel Administrativo

Abra o arquivo `index.html` diretamente no navegador. O painel se conectara automaticamente a API local.

---

## Endpoints da API

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/health` | Health check |
| POST | `/api/clientes` | Criar novo cliente |
| GET | `/api/clientes` | Listar clientes (filtro por status) |
| GET | `/api/clientes/{id}` | Buscar cliente por ID |
| PATCH | `/api/clientes/{id}/status` | Atualizar status do cliente |

### Exemplo: Criar cliente
```bash
curl -X POST http://localhost:8000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome": "Acme Corporation Ltda.", "status": "ativo"}'
```

### Exemplo: Listar clientes ativos
```bash
curl http://localhost:8000/api/clientes?status=ativo
```

---

## Proximas Dimensoes (Roadmap)

- `dim_empresas` — Gerenciamento de empresas/organizacoes
- `dim_produtos`  — Catalogo de produtos
- `dim_regioes`   — Hierarquia geografica
