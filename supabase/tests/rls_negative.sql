-- Negative checks for the mini-CRM. The script ROLLBACKs.
--
-- These cases must fail:
--   1. чужая задача — executor changes a task assigned to someone else
--   2. запрещённый переход — a status move outside the role's graph,
--      including rework without a comment
--   3. правка истории — INSERT, UPDATE, or DELETE of task_status_history
--
-- Run as the migration owner (postgres), after the migrations:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_negative.sql
--
-- The script simulates PostgREST by SET ROLE authenticated and setting the JWT
-- claims that auth.uid()/auth.role() read. It inserts auth.users directly, so
-- it is a database test, not a login test. Do not commit; it ends with ROLLBACK.

begin;

create or replace function public._crm_test_expect_fail(p_sql text, p_fragment text)
returns void
language plpgsql
as $$
declare
  v_ignored text;
begin
  begin
    execute p_sql into v_ignored;
    raise exception 'CRM_TEST_SUCCEEDED';
  exception
    when others then
      if sqlerrm = 'CRM_TEST_SUCCEEDED' then
        raise exception '%', format(
          'expected failure containing "%s", but SQL succeeded: %s',
          p_fragment,
          p_sql
        );
      end if;
      if position(p_fragment in sqlerrm) = 0 then
        raise exception '%', format(
          'expected "%s", got: %s; sql: %s',
          p_fragment,
          sqlerrm,
          p_sql
        );
      end if;
  end;

  raise notice 'fail ok: %', p_fragment;
end;
$$;

create or replace function public._crm_test_must(p_sql text, p_expected text)
returns void
language plpgsql
as $$
declare
  v_actual text;
begin
  execute p_sql into v_actual;
  if v_actual is distinct from p_expected then
    raise exception '%', format(
      'expected "%s", got "%s" for %s',
      p_expected,
      v_actual,
      p_sql
    );
  end if;
end;
$$;

create or replace procedure public._crm_test_act_as(p_uid uuid)
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

create or replace procedure public._crm_test_act_as_owner()
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claims', '', true);
  execute 'reset role';
end;
$$;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'manager@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Менеджер Тест"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'executor-a@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Исполнитель А"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'executor-b@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Исполнитель Б"}'::jsonb,
    now(),
    now()
  );

do $$
begin
  if to_regclass('auth.identities') is null then
    return;
  end if;

  insert into auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values
    (
      '11111111-1111-4111-8111-111111111112',
      '11111111-1111-4111-8111-111111111111',
      'email',
      '11111111-1111-4111-8111-111111111111',
      jsonb_build_object('sub', '11111111-1111-4111-8111-111111111111', 'email', 'manager@example.test'),
      now(),
      now(),
      now()
    ),
    (
      '22222222-2222-4222-8222-222222222223',
      '22222222-2222-4222-8222-222222222222',
      'email',
      '22222222-2222-4222-8222-222222222222',
      jsonb_build_object('sub', '22222222-2222-4222-8222-222222222222', 'email', 'executor-a@example.test'),
      now(),
      now(),
      now()
    ),
    (
      '33333333-3333-4333-8333-333333333334',
      '33333333-3333-4333-8333-333333333333',
      'email',
      '33333333-3333-4333-8333-333333333333',
      jsonb_build_object('sub', '33333333-3333-4333-8333-333333333333', 'email', 'executor-b@example.test'),
      now(),
      now(),
      now()
    );
end
$$;

-- Manual role assignment, as the table owner (auth.role() is null here).
update public.profiles
set role = 'manager'
where id = '11111111-1111-4111-8111-111111111111';

insert into public.objects (id, name, address, created_by)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Объект А',
    'ул. Ленина, 1',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'Объект Б',
    'ул. Мира, 2',
    '11111111-1111-4111-8111-111111111111'
  );

insert into public.tasks (id, object_id, title, description, assignee_id, author_id)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Задача А',
    'Описание А',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'Задача Б',
    null,
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111'
  );

-- A new task cannot skip the graph by being inserted as accepted.
select public._crm_test_expect_fail(
  $sql$with changed as (
    insert into public.tasks (object_id, title, assignee_id, author_id, status)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'Сразу принято',
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
      'accepted'
    )
    returning 1
  )
  select count(*)::text from changed$sql$,
  'tasks must be created with status new'
);

-- MUST FAIL: чужая задача. Executor A cannot move executor B's task.
call public._crm_test_act_as('22222222-2222-4222-8222-222222222222');

select public._crm_test_expect_fail(
  $sql$select public.change_task_status(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'::uuid,
    'in_progress'::public.task_status,
    null
  )::text$sql$,
  'only the assignee can change this task'
);

select public._crm_test_must(
  $sql$select count(*)::text from public.tasks where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'$sql$,
  '0'
);

select public._crm_test_must(
  $sql$select count(*)::text from public.objects where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'$sql$,
  '0'
);

select public._crm_test_must(
  $sql$select count(*)::text from public.tasks where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'$sql$,
  '1'
);

call public._crm_test_act_as('33333333-3333-4333-8333-333333333333');

select public._crm_test_must(
  $sql$select count(*)::text from public.objects where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'$sql$,
  '0'
);

-- MUST FAIL: запрещённый переход. new → accepted is outside the graph even for a manager.
call public._crm_test_act_as('11111111-1111-4111-8111-111111111111');

select public._crm_test_expect_fail(
  $sql$select public.change_task_status(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'accepted'::public.task_status,
    null
  )::text$sql$,
  'forbidden transition'
);

call public._crm_test_act_as('22222222-2222-4222-8222-222222222222');

select public._crm_test_must(
  $sql$select (public.change_task_status(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'in_progress'::public.task_status,
    null
  )).to_status::text$sql$,
  'in_progress'
);

-- MUST FAIL: запрещённый переход. Executor cannot jump to accepted.
select public._crm_test_expect_fail(
  $sql$select public.change_task_status(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'accepted'::public.task_status,
    null
  )::text$sql$,
  'forbidden transition'
);

select public._crm_test_must(
  $sql$select (public.change_task_status(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'review'::public.task_status,
    null
  )).to_status::text$sql$,
  'review'
);

-- MUST FAIL: запрещённый переход. Accepting is manager-only.
select public._crm_test_expect_fail(
  $sql$select public.change_task_status(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'accepted'::public.task_status,
    null
  )::text$sql$,
  'forbidden transition'
);

call public._crm_test_act_as('11111111-1111-4111-8111-111111111111');

-- MUST FAIL: запрещённый переход. rework requires a comment.
select public._crm_test_expect_fail(
  $sql$select public.change_task_status(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'rework'::public.task_status,
    null
  )::text$sql$,
  'comment is required for rework'
);

select public._crm_test_expect_fail(
  $sql$select public.change_task_status(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'rework'::public.task_status,
    '   '
  )::text$sql$,
  'comment is required for rework'
);

select public._crm_test_must(
  $sql$select (public.change_task_status(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'rework'::public.task_status,
    'Нужно переделать стык'
  )).changed_by::text$sql$,
  '11111111-1111-4111-8111-111111111111'
);

do $$
declare
  v_row public.task_status_history;
begin
  select *
  into v_row
  from public.task_status_history
  where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    and to_status = 'rework';

  if not found then
    raise exception 'rework history row is missing';
  end if;

  if v_row.changed_by <> '11111111-1111-4111-8111-111111111111'::uuid then
    raise exception 'changed_by was %, expected the manager', v_row.changed_by;
  end if;

  if v_row.from_status <> 'review' or v_row.comment <> 'Нужно переделать стык' then
    raise exception 'unexpected rework history: % / %', v_row.from_status, v_row.comment;
  end if;

  if v_row.changed_at > now() or v_row.changed_at < now() - interval '5 minutes' then
    raise exception 'changed_at is not server time: %', v_row.changed_at;
  end if;
end
$$;

call public._crm_test_act_as('22222222-2222-4222-8222-222222222222');

select public._crm_test_must(
  $sql$select count(*)::text
  from public.task_status_history
  where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    and to_status = 'rework'$sql$,
  '1'
);

select public._crm_test_must(
  $sql$select (public.change_task_status(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'in_progress'::public.task_status,
    null
  )).to_status::text$sql$,
  'in_progress'
);

call public._crm_test_act_as('33333333-3333-4333-8333-333333333333');

select public._crm_test_must(
  $sql$select count(*)::text
  from public.task_status_history
  where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'$sql$,
  '0'
);

select public._crm_test_must(
  $sql$select (public.change_task_status(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'::uuid,
    'in_progress'::public.task_status,
    null
  )).to_status::text$sql$,
  'in_progress'
);

select public._crm_test_must(
  $sql$select (public.change_task_status(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'::uuid,
    'review'::public.task_status,
    null
  )).to_status::text$sql$,
  'review'
);

call public._crm_test_act_as('11111111-1111-4111-8111-111111111111');

select public._crm_test_must(
  $sql$select (public.change_task_status(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'::uuid,
    'accepted'::public.task_status,
    null
  )).to_status::text$sql$,
  'accepted'
);

-- MUST FAIL: запрещённый переход. accepted is terminal.
select public._crm_test_expect_fail(
  $sql$select public.change_task_status(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'::uuid,
    'in_progress'::public.task_status,
    null
  )::text$sql$,
  'forbidden transition'
);

-- The successful RPC must not leave the bypass flag on for the table owner.
call public._crm_test_act_as_owner();

select public._crm_test_expect_fail(
  $sql$with changed as (
    update public.tasks
    set status = 'accepted'::public.task_status
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    returning 1
  )
  select count(*)::text from changed$sql$,
  'status can only be changed via change_task_status()'
);

-- MUST FAIL: прямой UPDATE status из роли authenticated, даже если выставить служебный флаг.
call public._crm_test_act_as('11111111-1111-4111-8111-111111111111');

select set_config('app.status_change_via_rpc', 'on', true);
select set_config('app.status_change_task_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', true);

select public._crm_test_expect_fail(
  $sql$with changed as (
    update public.tasks
    set status = 'review'::public.task_status
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    returning 1
  )
  select count(*)::text from changed$sql$,
  'permission denied'
);

-- Executor cannot edit task fields either.
call public._crm_test_act_as('22222222-2222-4222-8222-222222222222');

select public._crm_test_expect_fail(
  $sql$with changed as (
    update public.tasks
    set title = 'Чужая правка'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    returning 1
  )
  select count(*)::text from changed$sql$,
  'row-level security'
);

select public._crm_test_expect_fail(
  $sql$with changed as (
    insert into public.objects (name, address)
    values ('Чужой объект', 'ул. Скрытая, 3')
    returning 1
  )
  select count(*)::text from changed$sql$,
  'row-level security'
);

-- MUST FAIL: правка истории. Clients have no write grant.
select public._crm_test_expect_fail(
  $sql$with changed as (
    insert into public.task_status_history (task_id, from_status, to_status, changed_by, comment)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      'new',
      'in_progress',
      '22222222-2222-4222-8222-222222222222',
      'подделка'
    )
    returning 1
  )
  select count(*)::text from changed$sql$,
  'permission denied'
);

select public._crm_test_expect_fail(
  $sql$with changed as (
    update public.task_status_history
    set comment = 'подделка'
    where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    returning 1
  )
  select count(*)::text from changed$sql$,
  'permission denied'
);

select public._crm_test_expect_fail(
  $sql$with changed as (
    delete from public.task_status_history
    where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    returning 1
  )
  select count(*)::text from changed$sql$,
  'permission denied'
);

-- MUST FAIL: правка истории. The table owner is blocked by the trigger too.
call public._crm_test_act_as_owner();

select public._crm_test_expect_fail(
  $sql$with changed as (
    insert into public.task_status_history (task_id, from_status, to_status, changed_by, comment)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      'new',
      'in_progress',
      '11111111-1111-4111-8111-111111111111',
      'подделка'
    )
    returning 1
  )
  select count(*)::text from changed$sql$,
  'task_status_history cannot be modified'
);

select public._crm_test_expect_fail(
  $sql$with changed as (
    update public.task_status_history
    set comment = 'подделка'
    where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    returning 1
  )
  select count(*)::text from changed$sql$,
  'task_status_history cannot be modified'
);

select public._crm_test_expect_fail(
  $sql$with changed as (
    delete from public.task_status_history
    where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    returning 1
  )
  select count(*)::text from changed$sql$,
  'task_status_history cannot be modified'
);

-- Column privilege blocks role changes from authenticated. The trigger blocks
-- them even for the table owner when the JWT says authenticated.
call public._crm_test_act_as('22222222-2222-4222-8222-222222222222');

select public._crm_test_expect_fail(
  $sql$with changed as (
    update public.profiles
    set role = 'manager'
    where id = '22222222-2222-4222-8222-222222222222'
    returning 1
  )
  select count(*)::text from changed$sql$,
  'permission denied'
);

select public._crm_test_must(
  $sql$with changed as (
    update public.profiles
    set full_name = 'Исполнитель АUpdated'
    where id = '22222222-2222-4222-8222-222222222222'
    returning 1
  )
  select count(*)::text from changed$sql$,
  '1'
);

select public._crm_test_must(
  $sql$select role::text from public.profiles where id = '22222222-2222-4222-8222-222222222222'$sql$,
  'executor'
);

call public._crm_test_act_as_owner();

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);

select public._crm_test_expect_fail(
  $sql$with changed as (
    update public.profiles
    set role = 'manager'
    where id = '22222222-2222-4222-8222-222222222222'
    returning 1
  )
  select count(*)::text from changed$sql$,
  'users cannot change their role'
);

-- Owner without a user JWT can still assign roles by hand. Put the test user back.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);

update public.profiles
set role = 'manager'
where id = '22222222-2222-4222-8222-222222222222';

update public.profiles
set role = 'executor'
where id = '22222222-2222-4222-8222-222222222222';

-- Deleting a task cascades to its history. Direct history deletes stay forbidden.
call public._crm_test_act_as('11111111-1111-4111-8111-111111111111');

select public._crm_test_must(
  $sql$with changed as (
    delete from public.tasks
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'
    returning 1
  )
  select count(*)::text from changed$sql$,
  '1'
);

select public._crm_test_must(
  $sql$select count(*)::text
  from public.task_status_history
  where task_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'$sql$,
  '0'
);

rollback;
