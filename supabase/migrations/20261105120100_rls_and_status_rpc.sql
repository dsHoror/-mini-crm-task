-- Depends on 20261105120000_schema.sql.
--
-- Threat model: the browser holds only the anon key and calls PostgREST as
-- `authenticated`. Status changes and history writes go through
-- public.change_task_status(). Direct UPDATE of tasks.status and any client
-- write to task_status_history must fail.
--
-- The table owner in the SQL editor can still disable a trigger. That is
-- Postgres, not a client path. Do not give app users a SQL login.

-- Records the migration role. Triggers allow a status/history write only when
-- current_user is this role AND the RPC set a transaction-local flag.
-- RLS is on and there is no policy, so `authenticated` sees no row and
-- app_private.is_definer() is false. The owner bypasses RLS and can read it.
-- Do not FORCE ROW LEVEL SECURITY here: the RPC runs as this owner.

create table app_private.runtime (
  singleton integer primary key default 1,
  definer_role name not null,
  constraint runtime_singleton check (singleton = 1)
);

insert into app_private.runtime (singleton, definer_role)
values (1, current_user);

alter table app_private.runtime enable row level security;

create or replace function app_private.is_definer()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from app_private.runtime
    where singleton = 1
      and definer_role = current_user
  );
$$;

-- Allowed graph:
--   executor (assignee only): new→in_progress, in_progress→review, rework→in_progress
--   manager (any task):       those, plus review→accepted and review→rework
--   accepted is terminal
-- Moving to rework also requires a non-blank comment; that check lives in the RPC
-- and in task_status_history_rework_comment.

create or replace function app_private.task_transition_allowed(
  p_from public.task_status,
  p_to public.task_status,
  p_role public.user_role
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select case p_role
    when 'manager' then
      (p_from = 'new'::public.task_status and p_to = 'in_progress'::public.task_status)
      or (p_from = 'in_progress'::public.task_status and p_to = 'review'::public.task_status)
      or (p_from = 'review'::public.task_status and p_to = 'accepted'::public.task_status)
      or (p_from = 'review'::public.task_status and p_to = 'rework'::public.task_status)
      or (p_from = 'rework'::public.task_status and p_to = 'in_progress'::public.task_status)
    when 'executor' then
      (p_from = 'new'::public.task_status and p_to = 'in_progress'::public.task_status)
      or (p_from = 'in_progress'::public.task_status and p_to = 'review'::public.task_status)
      or (p_from = 'rework'::public.task_status and p_to = 'in_progress'::public.task_status)
    else false
  end;
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'manager'
  );
$$;

comment on function public.is_manager() is
  'True when the JWT user is a manager. Security definer so RLS policies can call it without recursing into profiles RLS.';

create or replace function public.change_task_status(
  p_task_id uuid,
  p_to_status public.task_status,
  p_comment text default null
)
returns public.task_status_history
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_task public.tasks;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_history public.task_status_history;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_to_status is null then
    raise exception 'to_status is required' using errcode = '23514';
  end if;

  select role
  into v_role
  from public.profiles
  where id = v_uid;

  if v_role is null then
    raise exception 'profile not found' using errcode = '42501';
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'task not found' using errcode = 'P0002';
  end if;

  -- Executors may move only their own assigned tasks. Managers may move any task.
  if v_role = 'executor' and v_task.assignee_id is distinct from v_uid then
    raise exception 'only the assignee can change this task' using errcode = '42501';
  end if;

  if not app_private.task_transition_allowed(v_task.status, p_to_status, v_role) then
    raise exception 'forbidden transition from % to %', v_task.status, p_to_status
      using errcode = '42501';
  end if;

  if p_to_status = 'rework' and v_comment is null then
    raise exception 'comment is required for rework' using errcode = '23514';
  end if;

  -- Flags are transaction-local and cleared before return so a later statement
  -- in the same transaction cannot reuse them. authenticated still fails the
  -- definer check inside the triggers even if it sets the flags itself.
  perform set_config('app.status_change_via_rpc', 'on', true);
  perform set_config('app.history_insert_via_rpc', 'on', true);
  perform set_config('app.status_change_task_id', p_task_id::text, true);

  update public.tasks
  set status = p_to_status
  where id = p_task_id;

  if not found then
    raise exception 'task not found' using errcode = 'P0002';
  end if;

  insert into public.task_status_history (
    task_id,
    from_status,
    to_status,
    changed_by,
    comment,
    changed_at
  )
  values (
    p_task_id,
    v_task.status,
    p_to_status,
    v_uid,
    v_comment,
    now()
  )
  returning *
  into v_history;

  perform set_config('app.status_change_via_rpc', 'off', true);
  perform set_config('app.history_insert_via_rpc', 'off', true);
  perform set_config('app.status_change_task_id', '', true);

  return v_history;
end;
$$;

comment on function public.change_task_status(uuid, public.task_status, text) is
  'Changes a task status and writes task_status_history. changed_by is auth.uid(), changed_at is now().';

create or replace function app_private.tasks_before_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op is null then
    raise exception 'trigger only';
  end if;

  new.created_at := old.created_at;
  new.author_id := old.author_id;
  new.updated_at := now();

  if new.status is distinct from old.status
     and (
       app_private.is_definer() is not true
       or current_setting('app.status_change_via_rpc', true) is distinct from 'on'
       or new.id::text is distinct from current_setting('app.status_change_task_id', true)
     )
  then
    raise exception 'status can only be changed via change_task_status()';
  end if;

  return new;
end;
$$;

create trigger tasks_before_update
  before update on public.tasks
  for each row
  execute function app_private.tasks_before_update();

create or replace function app_private.task_status_history_guard()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op is null then
    raise exception 'trigger only';
  end if;

  if tg_op = 'UPDATE' then
    raise exception 'task_status_history cannot be modified';
  end if;

  if tg_op = 'DELETE' then
    -- Parent task is already gone: this is the ON DELETE CASCADE from tasks,
    -- not a client deleting history rows.
    if not exists (select 1 from public.tasks where id = old.task_id) then
      return old;
    end if;
    raise exception 'task_status_history cannot be modified';
  end if;

  if tg_op = 'INSERT' then
    if app_private.is_definer() is not true
       or current_setting('app.history_insert_via_rpc', true) is distinct from 'on'
       or new.task_id::text is distinct from current_setting('app.status_change_task_id', true)
    then
      raise exception 'task_status_history cannot be modified';
    end if;

    if auth.uid() is not null and new.changed_by is distinct from auth.uid() then
      raise exception 'changed_by must be auth.uid()';
    end if;

    if new.changed_by is null then
      raise exception 'changed_by is required';
    end if;

    new.changed_at := now();
    return new;
  end if;

  raise exception 'task_status_history cannot be modified';
end;
$$;

create trigger task_status_history_guard
  before insert or update or delete on public.task_status_history
  for each row
  execute function app_private.task_status_history_guard();

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy objects_manager_all
  on public.objects
  for all
  to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

create policy objects_executor_select_assigned
  on public.objects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tasks as task
      where task.object_id = objects.id
        and task.assignee_id = (select auth.uid())
    )
  );

create policy tasks_manager_all
  on public.tasks
  for all
  to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

-- Makes a direct executor UPDATE fail with an RLS error instead of updating 0 rows.
-- The status RPC is security definer and bypasses RLS after its own checks.
create policy tasks_executor_update_blocked
  on public.tasks
  for update
  to authenticated
  using (assignee_id = (select auth.uid()))
  with check (false);

create policy tasks_executor_select_own
  on public.tasks
  for select
  to authenticated
  using (assignee_id = (select auth.uid()));

create policy task_status_history_select_visible
  on public.task_status_history
  for select
  to authenticated
  using (
    (select public.is_manager())
    or exists (
      select 1
      from public.tasks as task
      where task.id = task_status_history.task_id
        and task.assignee_id = (select auth.uid())
    )
  );

grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;

revoke all on table public.profiles from anon, authenticated, PUBLIC;
revoke all on table public.objects from anon, authenticated, PUBLIC;
revoke all on table public.tasks from anon, authenticated, PUBLIC;
revoke all on table public.task_status_history from anon, authenticated, PUBLIC;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

grant select, insert, update, delete on public.objects to authenticated;

grant select, insert, delete on public.tasks to authenticated;
grant update (title, description, assignee_id, object_id) on public.tasks to authenticated;

-- History is select-only for clients. No INSERT, UPDATE, or DELETE grant.
grant select on public.task_status_history to authenticated;

revoke all on table app_private.runtime from anon, authenticated, PUBLIC;
grant select on app_private.runtime to authenticated;

revoke all on function public.is_manager() from PUBLIC, anon, authenticated;
grant execute on function public.is_manager() to authenticated;

revoke all on function public.change_task_status(uuid, public.task_status, text)
  from PUBLIC, anon, authenticated;
grant execute on function public.change_task_status(uuid, public.task_status, text)
  to authenticated;

revoke all on function app_private.handle_new_user() from PUBLIC;
revoke all on function app_private.profiles_before_update() from PUBLIC;
revoke all on function app_private.objects_before_write() from PUBLIC;
revoke all on function app_private.tasks_before_insert() from PUBLIC;
revoke all on function app_private.tasks_before_update() from PUBLIC;
revoke all on function app_private.task_status_history_guard() from PUBLIC;
revoke all on function app_private.is_definer() from PUBLIC;
revoke all on function app_private.task_transition_allowed(
  public.task_status,
  public.task_status,
  public.user_role
) from PUBLIC;

-- Trigger functions run as the invoker, so authenticated needs EXECUTE.
-- They reject calls made outside a trigger (tg_op is null).
grant execute on function app_private.profiles_before_update() to authenticated;
grant execute on function app_private.objects_before_write() to authenticated;
grant execute on function app_private.tasks_before_insert() to authenticated;
grant execute on function app_private.tasks_before_update() to authenticated;
grant execute on function app_private.task_status_history_guard() to authenticated;
grant execute on function app_private.is_definer() to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema app_private to supabase_auth_admin;
    grant execute on function app_private.handle_new_user() to supabase_auth_admin;
  end if;
end
$$;

-- Negative cases that must fail are exercised in supabase/tests/rls_negative.sql:
--   a task assigned to someone else, a transition outside the graph,
--   and any direct insert/update/delete of task_status_history.
