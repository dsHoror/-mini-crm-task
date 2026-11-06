-- Mini-CRM «Объекты и задачи» (2B Studio).
-- Schema only. Access control is in the next migration.
-- Apply files in supabase/migrations in lexical order, as the table owner
-- (Supabase SQL editor or `supabase db push`). Do not run them with the anon key.

create schema if not exists app_private;

revoke all on schema app_private from PUBLIC;

create type public.user_role as enum ('manager', 'executor');

create type public.task_status as enum (
  'new',
  'in_progress',
  'review',
  'accepted',
  'rework'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'executor',
  constraint profiles_full_name_not_blank check (char_length(btrim(full_name)) > 0)
);

comment on table public.profiles is
  'App profile for auth.users. role is assigned manually in SQL, never by the signed-in user.';

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint objects_name_not_blank check (char_length(btrim(name)) > 0),
  constraint objects_address_not_blank check (char_length(btrim(address)) > 0)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.profiles (id) on delete restrict,
  status public.task_status not null default 'new',
  author_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (char_length(btrim(title)) > 0)
);

comment on column public.tasks.status is
  'Do not update this column directly. Use public.change_task_status().';

create table public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  from_status public.task_status not null,
  to_status public.task_status not null,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  comment text,
  changed_at timestamptz not null default now(),
  constraint task_status_history_status_changed check (from_status <> to_status),
  constraint task_status_history_rework_comment check (
    to_status <> 'rework'
    or (comment is not null and char_length(btrim(comment)) > 0)
  ),
  constraint task_status_history_comment_length check (
    comment is null or char_length(comment) <= 4000
  )
);

comment on table public.task_status_history is
  'Append-only audit of status changes. Inserts come from change_task_status(); clients cannot write this table.';

create index tasks_assignee_object_idx on public.tasks (assignee_id, object_id);

create index tasks_object_id_idx on public.tasks (object_id);

create index task_status_history_task_idx
  on public.task_status_history (task_id, changed_at);

-- New auth users get an executor profile. Signup itself stays disabled in the project.
-- Promote a manager afterwards with SQL run as the table owner:
--   update public.profiles set role = 'manager' where id = '<user uuid>';

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.email), ''),
      'Без имени'
    ),
    'executor'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function app_private.handle_new_user();

create or replace function app_private.profiles_before_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op is null then
    raise exception 'trigger only';
  end if;

  if new.id is distinct from old.id then
    raise exception 'profile id cannot be changed';
  end if;

  -- authenticated (and a session that merely set role authenticated) cannot change role.
  -- The SQL editor runs as the table owner with auth.role() null, which is the manual path.
  if new.role is distinct from old.role
     and (
       auth.role() = 'authenticated'
       or current_user in ('authenticated', 'anon')
     )
  then
    raise exception 'users cannot change their role';
  end if;

  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row
  execute function app_private.profiles_before_update();

create or replace function app_private.objects_before_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op is null then
    raise exception 'trigger only';
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
    if new.created_by is null then
      raise exception 'created_by is required';
    end if;
    new.created_at := now();
    return new;
  end if;

  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger objects_before_write
  before insert or update on public.objects
  for each row
  execute function app_private.objects_before_write();

create or replace function app_private.tasks_before_insert()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op is null then
    raise exception 'trigger only';
  end if;

  if new.status is distinct from 'new'::public.task_status then
    raise exception 'tasks must be created with status new';
  end if;

  if auth.uid() is not null then
    new.author_id := auth.uid();
  end if;

  if new.author_id is null then
    raise exception 'author_id is required';
  end if;

  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_before_insert
  before insert on public.tasks
  for each row
  execute function app_private.tasks_before_insert();
