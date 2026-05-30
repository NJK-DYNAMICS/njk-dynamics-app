"""
============================================================
 NJK DYNAMICS -- DATAWARE
 Script: setup_supabase.py
 Funcao: Criar a tabela 'dim_clientes' no Supabase
============================================================

 COMO USAR:
  1. Copie .env.example para .env e preencha suas credenciais
  2. Execute: python setup_supabase.py

 NOTA: O SQL abaixo tambem pode ser colado diretamente no
       SQL Editor do Supabase Dashboard.
============================================================
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# -- Carrega variaveis de ambiente
load_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "Credenciais nao encontradas.\n"
        "Copie .env.example -> .env e preencha SUPABASE_URL e SUPABASE_KEY."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -- SQL de criacao da tabela dim_clientes com ID sequencial (SERIAL)
SQL_CREATE_TABLE = """
-- Tabela de dimensao de clientes com ID sequencial automatico
CREATE TABLE IF NOT EXISTS dim_clientes (
    id            SERIAL      PRIMARY KEY,
    nome          TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo', 'inativo', 'suspenso')),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para atualizar 'atualizado_em' automaticamente
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

-- Habilita Row Level Security
ALTER TABLE dim_clientes ENABLE ROW LEVEL SECURITY;

-- Politica para service_role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='dim_clientes' AND policyname='service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON dim_clientes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Politica para anon (necessario com anon key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='dim_clientes' AND policyname='anon_full_access'
  ) THEN
    CREATE POLICY anon_full_access ON dim_clientes FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
"""

def main():
    print("=" * 55)
    print("  NJK DYNAMICS -- DATAWARE Setup")
    print("  Criando tabela: dim_clientes (ID serial)")
    print("=" * 55)

    try:
        result = supabase.rpc("execute_sql", {"query": SQL_CREATE_TABLE}).execute()
        print("\n[OK] Tabela 'dim_clientes' criada com sucesso!")
        print(f"     Resultado: {result.data}")

    except Exception as e:
        print("\n[AVISO] RPC nao disponivel. Execute o SQL abaixo no Supabase Dashboard:")
        print("\n" + "-" * 55)
        print(SQL_CREATE_TABLE)
        print("-" * 55)
        print(f"\n   (Detalhe do erro: {e})")


if __name__ == "__main__":
    main()
