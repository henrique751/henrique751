-- Esquema de referência para backend autenticado.
-- Não executar em banco público sem revisão de segurança.

create table if not exists conversations (
  id uuid primary key,
  session_id text unique not null,
  customer_name text,
  customer_city text,
  assigned_seller_id text,
  consent_at timestamptz,
  summary text,
  structured_memory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_facts (
  id uuid primary key,
  sku text,
  manufacturer_reference text,
  brand text,
  field_name text not null,
  field_value text not null,
  unit text,
  source_type text not null,
  source_uri text,
  evidence_excerpt text,
  consulted_at timestamptz not null default now(),
  revalidate_at timestamptz,
  confidence numeric(4,3),
  status text not null check (status in ('verified','pending_review','conflicting','rejected','expired','general_guidance','customer_claim')),
  approved_by text,
  previous_version jsonb,
  change_reason text,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_facts_sku_idx on knowledge_facts (sku);
create index if not exists knowledge_facts_status_idx on knowledge_facts (status);

create table if not exists knowledge_gaps (
  id uuid primary key,
  conversation_id uuid references conversations(id),
  question text not null,
  sku text,
  manufacturer_reference text,
  category text,
  intent text,
  status text not null default 'pending_review',
  suggested_source_uri text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists quotes (
  id uuid primary key,
  conversation_id uuid references conversations(id),
  customer_name text,
  customer_city text,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quote_items (
  id uuid primary key,
  quote_id uuid not null references quotes(id) on delete cascade,
  sku text not null,
  manufacturer_reference text,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  item_status text not null check (item_status in ('confirmed','needs_disambiguation','not_found','availability_pending','price_pending','alternative_suggested','removed')),
  observation text,
  created_at timestamptz not null default now()
);

create table if not exists handoffs (
  id uuid primary key,
  conversation_id uuid references conversations(id),
  seller_id text not null,
  reason text,
  message_preview text,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists assistant_metrics (
  id bigint generated always as identity primary key,
  event_name text not null,
  intent text,
  sku text,
  success boolean,
  duration_ms integer,
  anonymous_session_hash text,
  created_at timestamptz not null default now()
);
