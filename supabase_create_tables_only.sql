-- =============================================
-- SADECE BU SQL'İ SUPABASE SQL EDİTÖR'E YAPISTIR
-- (Tabloları oluşturur, RLS veya başka şey yok)
-- =============================================

create table if not exists ideas (
  id text primary key,
  user_id text not null,
  title text,
  raw_input text,
  domain text,
  status text,
  priority text,
  tags text[],
  action_plan jsonb,
  grounded_research jsonb,
  sub_ideas jsonb,
  etsy_listing jsonb,
  visual_concepts jsonb,
  design_brief jsonb,
  maturity_score integer,
  is_favorite boolean default false,
  parent_id text,
  source_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists keywords (
  id text primary key,
  user_id text not null,
  keyword text not null,
  search_volume integer,
  search_result integer,
  conversion_rate numeric,
  source text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pipeline_logs (
  id text primary key,
  idea_id text,
  user_id text not null,
  stage text,
  status text,
  details jsonb,
  created_at timestamptz default now()
);

create table if not exists seasonal_automation_log (
  id text primary key,
  user_id text not null,
  event_name text,
  triggered_at timestamptz default now(),
  ideas_spawned integer default 0
);
