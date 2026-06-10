-- ============================================================================
--  Módulo de Entregas com WhatsApp — Schema
--  Todas as tabelas usam UUID (gen_random_uuid) — nada de IDs sequenciais.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
--  Catálogo / Clientes / Motoboys
-- ----------------------------------------------------------------------------
create table if not exists produtos (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null,
  preco numeric(10, 2) not null check (preco >= 0),
  ativo boolean not null default true
);

create table if not exists clientes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  whatsapp   text not null,
  cpf        text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists motoboys (
  id       uuid primary key default gen_random_uuid(),
  nome     text not null,
  whatsapp text,
  codigo   text not null unique,           -- código próprio de login do motoboy
  ativo    boolean not null default true
);

-- ----------------------------------------------------------------------------
--  Vendas
-- ----------------------------------------------------------------------------
create table if not exists vendas (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references clientes(id),
  cliente_nome    text,                     -- snapshot do nome no momento da venda
  total           numeric(10, 2) not null check (total >= 0),
  tipo_entrega    text not null check (tipo_entrega in ('retirada', 'motoboy')),
  codigo_retirada text not null unique,     -- aleatório, alfanumérico (gerado via crypto)
  situacao        text not null default 'aguardando'
                    check (situacao in ('aguardando', 'em_entrega', 'concluida', 'cancelada')),
  created_at      timestamptz not null default now()
);

create table if not exists itens_venda (
  id             uuid primary key default gen_random_uuid(),
  venda_id       uuid not null references vendas(id) on delete cascade,
  produto_id     uuid not null references produtos(id),
  quantidade     int not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0)
);

-- ----------------------------------------------------------------------------
--  Entregas
-- ----------------------------------------------------------------------------
create table if not exists entregas (
  id           uuid primary key default gen_random_uuid(),
  venda_id     uuid not null references vendas(id) on delete cascade,
  tipo         text not null check (tipo in ('retirada', 'motoboy')),
  situacao     text not null default 'pendente'
                 check (situacao in ('pendente', 'parcial', 'concluida')),
  motoboy_id   uuid references motoboys(id),
  endereco     text,                        -- endereço de entrega (obrigatório p/ motoboy)
  responsavel  text,                        -- quem confirmou a retirada na loja
  concluida_em timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists itens_entrega (
  id            uuid primary key default gen_random_uuid(),
  entrega_id    uuid not null references entregas(id) on delete cascade,
  item_venda_id uuid not null references itens_venda(id) on delete cascade,
  quantidade    int not null check (quantidade > 0),
  entregue      boolean not null default false,
  entregue_em   timestamptz,
  observacao    text
);

-- ----------------------------------------------------------------------------
--  Autorizações ("esqueci o código") — exige registro de gerente
-- ----------------------------------------------------------------------------
create table if not exists autorizacoes (
  id             uuid primary key default gen_random_uuid(),
  entrega_id     uuid references entregas(id),
  venda_id       uuid references vendas(id),
  autorizado_por text not null,             -- nome/identificação do gerente
  motivo         text not null,
  cpf_informado  text,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  Auditoria: log de tentativas (rate limiting) e eventos de entrega
-- ----------------------------------------------------------------------------
create table if not exists tentativas_log (
  id            uuid primary key default gen_random_uuid(),
  contexto      text not null,              -- 'retirada_codigo' | 'retirada_cpf' | 'motoboy_login' | 'motoboy_liberacao'
  identificador text,                       -- cpf/código (parcialmente mascarado)
  sucesso       boolean not null,
  detalhe       text,
  created_at    timestamptz not null default now()
);

create table if not exists entrega_eventos (
  id               uuid primary key default gen_random_uuid(),
  entrega_id       uuid not null references entregas(id) on delete cascade,
  motoboy_id       uuid references motoboys(id),
  itens_entregues  int not null default 0,
  itens_pendentes  int not null default 0,
  observacao       text,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  Índices
-- ----------------------------------------------------------------------------
create index if not exists idx_vendas_codigo       on vendas(codigo_retirada);
create index if not exists idx_itens_venda_venda   on itens_venda(venda_id);
create index if not exists idx_entregas_motoboy    on entregas(motoboy_id);
create index if not exists idx_entregas_venda      on entregas(venda_id);
create index if not exists idx_itens_entrega_eid   on itens_entrega(entrega_id);
create index if not exists idx_tentativas_ctx      on tentativas_log(contexto, identificador, created_at);

-- ----------------------------------------------------------------------------
--  Segurança: RLS habilitado em todas as tabelas.
--  Não criamos policies públicas de propósito — o acesso acontece apenas
--  via service_role (server actions no Next.js), que ignora RLS.
--  Assim a anon key NUNCA consegue ler/escrever direto do navegador.
-- ----------------------------------------------------------------------------
alter table produtos        enable row level security;
alter table clientes        enable row level security;
alter table motoboys        enable row level security;
alter table vendas          enable row level security;
alter table itens_venda     enable row level security;
alter table entregas        enable row level security;
alter table itens_entrega   enable row level security;
alter table autorizacoes    enable row level security;
alter table tentativas_log  enable row level security;
alter table entrega_eventos enable row level security;
