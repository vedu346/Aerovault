-- AI training knowledge and chat logs
create table if not exists public.ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

create index if not exists ai_knowledge_question_idx on public.ai_knowledge using gin (to_tsvector('english', question));
create index if not exists ai_knowledge_answer_idx on public.ai_knowledge using gin (to_tsvector('english', answer));

create table if not exists public.ai_chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  user_message text not null,
  assistant_reply text not null,
  matched_knowledge jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_logs_created_at_idx on public.ai_chat_logs(created_at desc);
create index if not exists ai_chat_logs_user_id_idx on public.ai_chat_logs(user_id);
