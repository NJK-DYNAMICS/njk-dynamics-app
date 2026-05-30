# NJK Dynamics — Ecossistema

Monorepo vanilla (HTML/CSS/JS) + API Python (FastAPI).

## Estrutura

```
apps/           # Frontends (um deploy Vercel por pasta)
  nexus/        # Portal NEXUS
  dataware/     # Gerenciador de Clientes (UI)
  finalyze/     # Calculadora de contratos
src/
  pages/        # JavaScript por app
  styles/       # CSS (tokens + por app)
  components/   # UI compartilhada (evolução)
api/
  dataware/     # Backend FastAPI + Supabase
backup_antigravity/  # Snapshot pré-reorganização
```

## Executar localmente

Na **raiz do repositório** (os HTMLs usam caminhos relativos `../../src/...`):

```bash
npx serve .
```

- Nexus: `/` ou `/apps/nexus/index.html`
- Dataware UI: `/dataware` ou `/apps/dataware/index.html`
- Finalyze: `/finalyze` ou `/apps/finalyze/index.html`

API: `cd api/dataware && pip install -r requirements.txt && uvicorn main:app --reload`

## Deploy Vercel

Configure **Root Directory** = raiz do repositório (`.`). Não use apenas `apps/nexus` — o CSS/JS compartilhado fica em `src/`.

No Render, defina **Root Directory** = `api/dataware` para a API.

Documentação mestre: `master_context.md`
