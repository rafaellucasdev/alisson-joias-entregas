-- ============================================================================
--  AJ Progress Tracker — Schema (substitui o antigo schema de Entregas/Estoque)
--  Fonte ÚNICA de verdade do progresso de desenvolvimento do ERP.
--  Idempotente de propósito: `npm run db:push` re-roda este arquivo inteiro
--  toda vez (não há versionamento), então nada aqui pode quebrar nem apagar
--  dados na 2ª execução.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 0) Limpeza do schema antigo (Entregas/Estoque) — projeto reaproveitado
--    (drop ... if exists é seguro: na 2ª execução essas tabelas já não existem)
-- ----------------------------------------------------------------------------
drop table if exists entrega_eventos cascade;
drop table if exists tentativas_log  cascade;
drop table if exists autorizacoes    cascade;
drop table if exists itens_entrega   cascade;
drop table if exists entregas        cascade;
drop table if exists itens_venda     cascade;
drop table if exists vendas          cascade;
drop table if exists motoboys        cascade;
drop table if exists clientes        cascade;
drop table if exists produtos        cascade;

-- ----------------------------------------------------------------------------
-- 1) Enums (idempotente)
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'usuario_papel') then
    create type usuario_papel as enum ('admin','dev','viewer'); end if;
  if not exists (select 1 from pg_type where typname = 'tarefa_status') then
    create type tarefa_status as enum ('todo','doing','done','blocked','cancelled'); end if;
  if not exists (select 1 from pg_type where typname = 'tarefa_tipo') then
    create type tarefa_tipo as enum ('bug','melhoria','seguranca','performance','refatoracao','infra','limpeza'); end if;
  if not exists (select 1 from pg_type where typname = 'tarefa_prioridade') then
    create type tarefa_prioridade as enum ('baixa','media','alta','critica'); end if;
  if not exists (select 1 from pg_type where typname = 'evento_tipo') then
    create type evento_tipo as enum ('criacao','status','atribuicao','comentario','nota_ia','microtarefa','bloqueio'); end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2) Tabelas
-- ----------------------------------------------------------------------------
create table if not exists modulos (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  slug      text unique not null,
  ordem     int  not null default 0,
  criado_em timestamptz not null default now()
);

-- perfil ligado ao login do Supabase Auth (auth.users)
create table if not exists usuarios (
  id        uuid primary key references auth.users(id) on delete cascade,
  nome      text not null,
  email     text unique not null,
  papel     usuario_papel not null default 'dev',
  criado_em timestamptz not null default now()
);

-- FONTE DE VERDADE
create table if not exists tarefas (
  id             uuid primary key default gen_random_uuid(),
  modulo_id      uuid not null references modulos(id),
  codigo         text,
  titulo         text not null,
  descricao      text,                 -- o que é
  impacto        text,                 -- por que importa
  tipo           tarefa_tipo,
  categoria      text,
  status         tarefa_status not null default 'todo',
  prioridade     tarefa_prioridade not null default 'media', -- recomendada pela IA (ordem de execução)
  urgencia       tarefa_prioridade,                          -- recomendada pela IA (sensibilidade ao tempo)
  prioridade_ia  boolean not null default true,              -- true = recomendação da IA ainda não alterada por humano
  analise_ia     text,                                       -- justificativa da IA p/ urgência + prioridade
  analisado_em   timestamptz,                                -- quando a IA analisou
  branch         text,
  criterio_teste text,
  responsavel_id uuid references usuarios(id),
  criado_por     uuid references usuarios(id),  -- null = criado pela IA
  origem         text not null default 'humano',-- 'humano' | 'ia'
  ordem          numeric not null default 0,    -- ordenação manual no kanban
  data_inicio    timestamptz,
  data_fim       timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

-- timeline append-only = o diário em tempo real
create table if not exists tarefa_eventos (
  id          uuid primary key default gen_random_uuid(),
  tarefa_id   uuid not null references tarefas(id) on delete cascade,
  tipo        evento_tipo not null,
  autor_id    uuid references usuarios(id),
  autor_label text,                    -- ex.: 'ia:deepseek' quando não é usuário
  descricao   text,
  payload     jsonb,
  criado_em   timestamptz not null default now()
);

create index if not exists idx_eventos_tarefa        on tarefa_eventos (tarefa_id, criado_em);
create index if not exists idx_tarefas_modulo_status on tarefas (modulo_id, status);
-- chave natural p/ seed idempotente (on conflict). NULLs em codigo são permitidos (várias tarefas da IA sem código).
create unique index if not exists uq_tarefas_modulo_codigo on tarefas (modulo_id, codigo);

-- ----------------------------------------------------------------------------
-- 3) atualizado_em automático
-- ----------------------------------------------------------------------------
create or replace function set_atualizado_em() returns trigger as $$
begin new.atualizado_em = now(); return new; end $$ language plpgsql;

drop trigger if exists trg_tarefas_upd on tarefas;
create trigger trg_tarefas_upd before update on tarefas
  for each row execute function set_atualizado_em();

-- ----------------------------------------------------------------------------
-- 4) RLS — logado lê tudo; admin/dev escreve; viewer só lê.
--    service_role (Server Actions + CLI da IA) ignora RLS automaticamente.
-- ----------------------------------------------------------------------------
alter table modulos        enable row level security;
alter table usuarios       enable row level security;
alter table tarefas        enable row level security;
alter table tarefa_eventos enable row level security;

drop policy if exists le_logado on modulos;
drop policy if exists le_logado on usuarios;
drop policy if exists le_logado on tarefas;
drop policy if exists le_logado on tarefa_eventos;
create policy le_logado on modulos        for select to authenticated using (true);
create policy le_logado on usuarios       for select to authenticated using (true);
create policy le_logado on tarefas        for select to authenticated using (true);
create policy le_logado on tarefa_eventos for select to authenticated using (true);

drop policy if exists escreve_dev on tarefas;
drop policy if exists escreve_dev on tarefa_eventos;
create policy escreve_dev on tarefas for all to authenticated
  using      (exists (select 1 from usuarios u where u.id = auth.uid() and u.papel in ('admin','dev')))
  with check (exists (select 1 from usuarios u where u.id = auth.uid() and u.papel in ('admin','dev')));
create policy escreve_dev on tarefa_eventos for all to authenticated
  using      (exists (select 1 from usuarios u where u.id = auth.uid() and u.papel in ('admin','dev')))
  with check (exists (select 1 from usuarios u where u.id = auth.uid() and u.papel in ('admin','dev')));

-- ----------------------------------------------------------------------------
-- 5) Realtime — board atualiza ao vivo (idempotente)
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='tarefas') then
    alter publication supabase_realtime add table tarefas; end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='tarefa_eventos') then
    alter publication supabase_realtime add table tarefa_eventos; end if;
end $$;
