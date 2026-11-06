-- Demo accounts and sample objects/tasks for local development.
-- Run as the database owner after the migrations, not with the anon key:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
-- Safe to run twice: if the demo emails already exist, the script does nothing.
-- Do not run this against a production project. Passwords are for the test stand only.
--
--   ivanov@2bstudio.test  / demo-ivanov   Иванов И.И.  постановщик (manager)
--   petrov@2bstudio.test  / demo-petrov   Петров П.П.  исполнитель (executor)

create extension if not exists pgcrypto;

do $seed$
declare
  v_manager uuid := 'a1111111-1111-4111-8111-111111111111';
  v_executor uuid := 'a2222222-2222-4222-8222-222222222222';
  v_north uuid := 'c1111111-1111-4111-8111-111111111111';
  v_warehouse uuid := 'c2222222-2222-4222-8222-222222222222';
  v_office uuid := 'c3333333-3333-4333-8333-333333333333';
  v_panel uuid := 'd1111111-1111-4111-8111-111111111111';
  v_plaster uuid := 'd2222222-2222-4222-8222-222222222222';
  v_tile uuid := 'd3333333-3333-4333-8333-333333333333';
  v_glazing uuid := 'd4444444-4444-4444-8444-444444444444';
  v_rough uuid := 'd5555555-5555-4555-8555-555555555555';
  v_vent uuid := 'd6666666-6666-4666-8666-666666666666';
  v_access uuid := 'd7777777-7777-4777-8777-777777777777';
  v_crypt_schema text;
  v_manager_hash text;
  v_executor_hash text;
  v_step record;
begin
  if exists (
    select 1
    from auth.users
    where id in (v_manager, v_executor)
       or email in ('ivanov@2bstudio.test', 'petrov@2bstudio.test')
  ) then
    raise notice 'Demo users already exist, seed skipped';
    return;
  end if;

  if to_regclass('auth.identities') is null then
    raise exception 'auth.identities is missing; a seeded user would not be able to sign in';
  end if;

  select n.nspname
  into v_crypt_schema
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where p.proname = 'crypt'
  order by case when n.nspname = 'extensions' then 0 else 1 end
  limit 1;

  if v_crypt_schema is null then
    raise exception 'pgcrypto crypt() is required to hash seed passwords';
  end if;

  execute format('select %I.crypt($1, %I.gen_salt(''bf''))', v_crypt_schema, v_crypt_schema)
    into v_manager_hash
    using 'demo-ivanov';

  execute format('select %I.crypt($1, %I.gen_salt(''bf''))', v_crypt_schema, v_crypt_schema)
    into v_executor_hash
    using 'demo-petrov';

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
      v_manager,
      'authenticated',
      'authenticated',
      'ivanov@2bstudio.test',
      v_manager_hash,
      now(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Иванов И.И."}'::jsonb,
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      v_executor,
      'authenticated',
      'authenticated',
      'petrov@2bstudio.test',
      v_executor_hash,
      now(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Петров П.П."}'::jsonb,
      now(),
      now()
    );

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
      'a1111111-1111-4111-8111-111111111112',
      v_manager,
      'email',
      v_manager::text,
      jsonb_build_object('sub', v_manager::text, 'email', 'ivanov@2bstudio.test'),
      now(),
      now(),
      now()
    ),
    (
      'a2222222-2222-4222-8222-222222222223',
      v_executor,
      'email',
      v_executor::text,
      jsonb_build_object('sub', v_executor::text, 'email', 'petrov@2bstudio.test'),
      now(),
      now(),
      now()
    );

  -- The signup trigger creates executor profiles. Promote the assigner as the table owner.
  update public.profiles
  set role = 'manager'
  where id = v_manager;

  insert into public.objects (id, name, address, created_by)
  values
    (v_north, 'ЖК Северный, корп. 3', 'ул. Ленина, 12', v_manager),
    (v_warehouse, 'Склад №2', 'пр. Мира, 45', v_manager),
    (v_office, 'Офис А', 'ул. Садовая, 8', v_manager);

  insert into public.tasks (id, object_id, title, description, assignee_id, author_id)
  values
    (
      v_panel,
      v_north,
      'Монтаж электрощита на 3 этаже',
      'Собрать и подключить этажный щит, подписать группы.',
      v_executor,
      v_manager
    ),
    (
      v_plaster,
      v_north,
      'Штукатурка стен 2 этаж',
      'Выровнять стены по маякам, второй этаж, секция А.',
      v_executor,
      v_manager
    ),
    (
      v_tile,
      v_north,
      'Укладка плитки санузел',
      'Санузел на 3 этаже. Швы ровные, без сколов.',
      v_executor,
      v_manager
    ),
    (
      v_glazing,
      v_north,
      'Проверка узлов остекления',
      'Проверить примыкания и уплотнители остекления.',
      v_executor,
      v_manager
    ),
    (
      v_rough,
      v_north,
      'Приёмка черновых работ',
      'Принять штукатурку и стяжку до чистовой отделки.',
      v_executor,
      v_manager
    ),
    (
      v_vent,
      v_warehouse,
      'Проверка вентиляции',
      'Проверить тягу и крепление воздуховодов.',
      v_executor,
      v_manager
    ),
    (
      v_access,
      v_office,
      'Согласовать доступ на объект',
      'Получить ключи и пропуск у заказчика.',
      null,
      v_manager
    );

  for v_step in
    select actor, task_id, to_status, note
    from (
      values
        (v_executor, v_panel, 'in_progress'::public.task_status, null::text),
        (v_executor, v_panel, 'review'::public.task_status, null::text),
        (v_executor, v_plaster, 'in_progress'::public.task_status, null::text),
        (v_executor, v_tile, 'in_progress'::public.task_status, null::text),
        (v_executor, v_tile, 'review'::public.task_status, null::text),
        (
          v_manager,
          v_tile,
          'rework'::public.task_status,
          'Шов у дверного проёма поплыл, переложите два ряда.'
        ),
        (v_executor, v_rough, 'in_progress'::public.task_status, null::text),
        (v_executor, v_rough, 'review'::public.task_status, null::text),
        (v_manager, v_rough, 'accepted'::public.task_status, null::text),
        (v_executor, v_vent, 'in_progress'::public.task_status, null::text)
    ) as step(actor, task_id, to_status, note)
  loop
    perform set_config('request.jwt.claim.sub', v_step.actor::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_step.actor::text, 'role', 'authenticated')::text,
      true
    );
    perform public.change_task_status(v_step.task_id, v_step.to_status, v_step.note);
  end loop;

  raise notice 'Seeded ivanov@2bstudio.test / demo-ivanov and petrov@2bstudio.test / demo-petrov';
end
$seed$;
