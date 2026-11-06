-- Depends on 20261105120000_schema.sql and 20261105120100_rls_and_status_rpc.sql.
-- Do not edit those files: they are already applied.
--
-- 1. History is immutable. Deleting a task that already has status history
--    fails, and deleting an object that still has tasks fails.
--    A task with no history rows can still be deleted.
-- 2. new→in_progress, in_progress→review and rework→in_progress belong only
--    to the assigned executor. A manager may only review→accepted and
--    review→rework (the rework comment check is unchanged).
-- 3. objects.name and tasks.title are 1..200 characters (char_length).

alter table public.task_status_history
  drop constraint task_status_history_task_id_fkey;

alter table public.task_status_history
  add constraint task_status_history_task_id_fkey
  foreign key (task_id) references public.tasks (id) on delete restrict;

comment on constraint task_status_history_task_id_fkey
  on public.task_status_history is
  'A task with status history cannot be deleted.';

alter table public.tasks
  drop constraint tasks_object_id_fkey;

alter table public.tasks
  add constraint tasks_object_id_fkey
  foreign key (object_id) references public.objects (id) on delete restrict;

comment on constraint tasks_object_id_fkey on public.tasks is
  'An object that still has tasks cannot be deleted.';

-- Direct history deletes stay forbidden even if the parent row is already gone.
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

  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
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

-- Assignee check stays in public.change_task_status: an executor may move only
-- a task assigned to them. This function only decides which edges a role has.
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
      (p_from = 'review'::public.task_status and p_to = 'accepted'::public.task_status)
      or (p_from = 'review'::public.task_status and p_to = 'rework'::public.task_status)
    when 'executor' then
      (p_from = 'new'::public.task_status and p_to = 'in_progress'::public.task_status)
      or (p_from = 'in_progress'::public.task_status and p_to = 'review'::public.task_status)
      or (p_from = 'rework'::public.task_status and p_to = 'in_progress'::public.task_status)
    else false
  end;
$$;

comment on function app_private.task_transition_allowed(
  public.task_status,
  public.task_status,
  public.user_role
) is
  'Executor: new→in_progress, in_progress→review, rework→in_progress. Manager: review→accepted and review→rework only.';

comment on function public.change_task_status(uuid, public.task_status, text) is
  'Changes a task status and writes history. Executor edges require the assignee. Managers may only accept a review or send it to rework.';

alter table public.objects
  add constraint objects_name_length
  check (char_length(name) between 1 and 200);

alter table public.tasks
  add constraint tasks_title_length
  check (char_length(title) between 1 and 200);
