create table if not exists public.mcp_request_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_payload jsonb not null,
  response_payload jsonb
);

create index if not exists mcp_request_logs_created_at_idx
  on public.mcp_request_logs (created_at desc);
