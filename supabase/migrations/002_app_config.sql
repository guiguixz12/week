-- =============================================================================
-- NutriWeek — Tabela de configuração do app (admin)
-- Execute no Supabase Dashboard → SQL Editor
-- =============================================================================

create table if not exists app_config (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- Somente service_role pode ler/escrever (sem acesso pelo frontend)
alter table app_config enable row level security;

-- Nenhuma policy pública: só service_role (server-side) acessa
