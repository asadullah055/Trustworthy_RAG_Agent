create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mime_type text not null,
  byte_size bigint not null default 0,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'ready', 'failed')),
  chunk_count integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists document_chunks_document_id_idx
  on public.document_chunks(document_id);

create index if not exists document_chunks_embedding_cosine_idx
  on public.document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count integer default 8,
  similarity_threshold double precision default 0.72
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  chunk_index integer,
  similarity double precision,
  content text,
  metadata jsonb
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    c.document_id,
    d.name as document_name,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.content,
    c.metadata
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where
    d.status = 'ready'
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

drop policy if exists "Service role manages documents" on public.documents;
create policy "Service role manages documents"
on public.documents
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role manages chunks" on public.document_chunks;
create policy "Service role manages chunks"
on public.document_chunks
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
