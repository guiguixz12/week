-- =============================================================================
-- NutriWeek — Schema inicial
-- Execute no Supabase Dashboard → SQL Editor (ou via Supabase CLI)
-- =============================================================================

-- ─── Extensões ────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─── Tipos enumerados ─────────────────────────────────────────────────────────

create type objetivo as enum (
  'emagrecer',
  'manter',
  'ganhar_massa'
);

create type tipo_refeicao as enum (
  'breakfast',
  'snack',
  'lunch',
  'dinner'
);

-- =============================================================================
-- TABELAS
-- =============================================================================

-- ─── users ────────────────────────────────────────────────────────────────────
-- Espelho de auth.users com campos de perfil nutricional.

create table public.users (
  id              uuid        primary key references auth.users (id) on delete cascade,
  email           text        not null unique,
  nome            text        not null,
  peso            numeric(5,2)            ,  -- kg
  altura          integer                 ,  -- cm
  objetivo        objetivo                ,
  calorias_meta   integer     check (calorias_meta > 0),
  proteina_meta   integer     check (proteina_meta > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table  public.users               is 'Perfil nutricional do usuário autenticado';
comment on column public.users.peso          is 'Peso em kg (até 999,99)';
comment on column public.users.altura        is 'Altura em centímetros';
comment on column public.users.calorias_meta is 'Meta diária de calorias (kcal)';
comment on column public.users.proteina_meta is 'Meta diária de proteína (g)';

-- ─── weekly_plans ─────────────────────────────────────────────────────────────
-- Um plano por semana por usuário. semana_inicio é sempre uma segunda-feira.

create table public.weekly_plans (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references public.users (id) on delete cascade,
  semana_inicio   date        not null,
  created_at      timestamptz not null default now(),

  unique (user_id, semana_inicio)
);

comment on table  public.weekly_plans               is 'Plano alimentar semanal';
comment on column public.weekly_plans.semana_inicio is 'Data da segunda-feira da semana (YYYY-MM-DD)';

-- ─── meal_slots ───────────────────────────────────────────────────────────────
-- Cada célula do calendário: (plano × dia × tipo de refeição).

create table public.meal_slots (
  id              uuid         primary key default uuid_generate_v4(),
  plan_id         uuid         not null references public.weekly_plans (id) on delete cascade,
  dia_semana      smallint     not null check (dia_semana between 0 and 6),  -- 0 = Seg, 6 = Dom
  tipo_refeicao   tipo_refeicao not null,
  nome            text         not null,
  calorias        integer      not null check (calorias >= 0),
  proteina        numeric(6,2) not null default 0 check (proteina >= 0),
  carbs           numeric(6,2) not null default 0 check (carbs    >= 0),
  gordura         numeric(6,2) not null default 0 check (gordura  >= 0),
  custo           numeric(8,2)           check (custo     >= 0),            -- BRL

  unique (plan_id, dia_semana, tipo_refeicao)
);

comment on table  public.meal_slots              is 'Refeição planejada para um dia/horário específico';
comment on column public.meal_slots.dia_semana   is '0=Segunda … 6=Domingo';
comment on column public.meal_slots.custo        is 'Custo estimado em BRL';

-- ─── recipes ──────────────────────────────────────────────────────────────────
-- Receitas criadas pelo usuário, reutilizáveis em qualquer semana.

create table public.recipes (
  id              uuid         primary key default uuid_generate_v4(),
  user_id         uuid         not null references public.users (id) on delete cascade,
  nome            text         not null,
  descricao       text,
  calorias        integer      not null check (calorias >= 0),
  proteina        numeric(6,2) not null default 0 check (proteina >= 0),
  carbs           numeric(6,2) not null default 0 check (carbs    >= 0),
  gordura         numeric(6,2) not null default 0 check (gordura  >= 0),
  -- Array de objetos: [{ nome, quantidade, unidade }]
  ingredientes    jsonb        not null default '[]'::jsonb,
  modo_preparo    text,
  tempo_preparo   integer      check (tempo_preparo > 0),   -- minutos
  porcoes         integer      check (porcoes       > 0),
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

comment on table  public.recipes             is 'Receitas salvas pelo usuário';
comment on column public.recipes.ingredientes is 'JSONB: [{ nome, quantidade, unidade }]';
comment on column public.recipes.tempo_preparo is 'Tempo de preparo em minutos';

-- =============================================================================
-- FUNÇÕES E TRIGGERS
-- =============================================================================

-- ─── Trigger: atualiza updated_at automaticamente ────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- ─── Trigger: cria perfil automaticamente após signup ────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- executa como owner para poder inserir em public.users
set search_path = public
as $$
begin
  insert into public.users (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'nome',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)   -- fallback: parte antes do @
    )
  )
  on conflict (id) do nothing;        -- idempotente em caso de retry
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- ÍNDICES
-- =============================================================================

create index idx_weekly_plans_user_week on public.weekly_plans (user_id, semana_inicio);
create index idx_meal_slots_plan        on public.meal_slots   (plan_id, dia_semana);
create index idx_recipes_user           on public.recipes      (user_id);
create index idx_recipes_nome           on public.recipes      using gin (to_tsvector('portuguese', nome));

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.users        enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.meal_slots   enable row level security;
alter table public.recipes      enable row level security;

-- ── users ─────────────────────────────────────────────────────────────────────

create policy "users: leitura própria"
  on public.users for select
  using (auth.uid() = id);

create policy "users: atualização própria"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── weekly_plans ──────────────────────────────────────────────────────────────

create policy "weekly_plans: leitura própria"
  on public.weekly_plans for select
  using (auth.uid() = user_id);

create policy "weekly_plans: inserção própria"
  on public.weekly_plans for insert
  with check (auth.uid() = user_id);

create policy "weekly_plans: atualização própria"
  on public.weekly_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "weekly_plans: exclusão própria"
  on public.weekly_plans for delete
  using (auth.uid() = user_id);

-- ── meal_slots ────────────────────────────────────────────────────────────────
-- Acesso indireto: o usuário é dono do plano que contém o slot.

create policy "meal_slots: leitura via plano próprio"
  on public.meal_slots for select
  using (
    exists (
      select 1 from public.weekly_plans wp
      where wp.id = meal_slots.plan_id
        and wp.user_id = auth.uid()
    )
  );

create policy "meal_slots: inserção via plano próprio"
  on public.meal_slots for insert
  with check (
    exists (
      select 1 from public.weekly_plans wp
      where wp.id = meal_slots.plan_id
        and wp.user_id = auth.uid()
    )
  );

create policy "meal_slots: atualização via plano próprio"
  on public.meal_slots for update
  using (
    exists (
      select 1 from public.weekly_plans wp
      where wp.id = meal_slots.plan_id
        and wp.user_id = auth.uid()
    )
  );

create policy "meal_slots: exclusão via plano próprio"
  on public.meal_slots for delete
  using (
    exists (
      select 1 from public.weekly_plans wp
      where wp.id = meal_slots.plan_id
        and wp.user_id = auth.uid()
    )
  );

-- ── recipes ───────────────────────────────────────────────────────────────────

create policy "recipes: leitura própria"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "recipes: inserção própria"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "recipes: atualização própria"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recipes: exclusão própria"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- FIM DA MIGRAÇÃO
-- =============================================================================
