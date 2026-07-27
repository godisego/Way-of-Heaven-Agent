-- Way of Heaven Agent: local-first → Supabase sync schema
-- 在 Supabase SQL Editor 中整份执行，或用 supabase db push。
-- 向量维度默认 3072（text-embedding-3-large）。若你用其他模型，改 embedding 列与 match_chunks 参数类型。

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id text primary key,
  original_file_name text not null,
  -- Storage 对象路径，例如 documents/{id}.pdf；本地同步时由脚本写入
  stored_file_path text not null,
  sha256 text not null unique,
  book_title text,
  author text,
  tradition text,
  file_type text not null check (file_type in ('pdf', 'markdown', 'text')),
  page_count integer not null default 0,
  status text not null,
  error_message text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  -- 同步元数据
  local_synced_at timestamptz
);

create index if not exists documents_tradition_idx on public.documents (tradition);
create index if not exists documents_status_idx on public.documents (status);

-- ---------------------------------------------------------------------------
-- document_pages
-- ---------------------------------------------------------------------------
create table if not exists public.document_pages (
  id text primary key,
  document_id text not null references public.documents (id) on delete cascade,
  page_number integer not null,
  section_title text,
  text text not null,
  text_hash text not null,
  char_count integer not null,
  extraction_method text not null,
  created_at timestamptz not null,
  unique (document_id, page_number)
);

create index if not exists document_pages_document_id_idx on public.document_pages (document_id);

-- ---------------------------------------------------------------------------
-- chunks（含 pgvector embedding）
-- ---------------------------------------------------------------------------
create table if not exists public.chunks (
  id text primary key,
  document_id text not null references public.documents (id) on delete cascade,
  page_id text not null references public.document_pages (id) on delete cascade,
  page_number integer not null,
  section_title text,
  chunk_index integer not null,
  text text not null,
  text_hash text not null,
  start_offset integer not null,
  end_offset integer not null,
  embedding_model text,
  vector_id text,
  -- 与本地 VectorRecord.embedding 对齐；text-embedding-3-large = 3072
  embedding vector(3072),
  created_at timestamptz not null,
  unique (document_id, page_number, chunk_index)
);

create index if not exists chunks_document_id_idx on public.chunks (document_id);

-- 数据量小可先不建索引；量上来后再建。3072 维在部分套餐/版本上 HNSW 可能受限，失败则改 halfvec 或降维。
-- create index chunks_embedding_hnsw_idx on public.chunks
--   using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- chat（为后续 Vercel 会话预留；本地同步可选推送）
-- ---------------------------------------------------------------------------
create table if not exists public.chat_sessions (
  id text primary key,
  title text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.chat_messages (
  id text primary key,
  session_id text not null references public.chat_sessions (id) on delete cascade,
  role text not null,
  content text not null,
  metadata_json jsonb,
  created_at timestamptz not null
);

create index if not exists chat_messages_session_id_idx on public.chat_messages (session_id);

create table if not exists public.answer_citations (
  id text primary key,
  message_id text not null references public.chat_messages (id) on delete cascade,
  document_id text not null references public.documents (id) on delete cascade,
  chunk_id text not null references public.chunks (id) on delete cascade,
  source_file_name text not null,
  page_number integer not null,
  quote text,
  created_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- 向量检索 RPC（云端问答时用；本地仍可继续 JSON 向量库）
-- ---------------------------------------------------------------------------
create or replace function public.match_chunks(
  query_embedding vector(3072),
  match_count integer default 8,
  filter_tradition text default null
)
returns table (
  id text,
  chunk_id text,
  document_id text,
  source_file_name text,
  page_number integer,
  section_title text,
  book_title text,
  author text,
  tradition text,
  text text,
  score double precision
)
language sql
stable
as $$
  select
    c.id,
    c.id as chunk_id,
    c.document_id,
    d.original_file_name as source_file_name,
    c.page_number,
    c.section_title,
    d.book_title,
    d.author,
    d.tradition,
    c.text,
    (1 - (c.embedding <=> query_embedding))::double precision as score
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where c.embedding is not null
    and (filter_tradition is null or d.tradition = filter_tradition)
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

-- ---------------------------------------------------------------------------
-- Storage：请在 Dashboard → Storage 手动创建 private bucket「documents」
-- 或在已启用 storage admin 的环境下取消下面注释执行：
-- insert into storage.buckets (id, name, public)
-- values ('documents', 'documents', false)
-- on conflict (id) do nothing;

-- 个人项目默认：仅 service_role 从服务端访问，不开匿名读写。
-- 若启用 Auth + RLS，再按 user_id 收紧策略。

alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.chunks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.answer_citations enable row level security;

-- 无策略 = 仅 service_role / 绕过 RLS 的后端可访问（supabase-js service key 默认绕过 RLS）。
-- 前端 anon key 读不到数据，这是有意设计。
