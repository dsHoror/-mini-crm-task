import { Button, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { type FormEvent } from 'react'
import { isSupabaseConfigured } from '../lib/supabase.ts'

export function Login() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <Stack gap="sm" component="section" aria-labelledby="login-title">
      <Title id="login-title" order={2}>
        Вход
      </Title>
      <Text>
        Регистрация в проекте выключена. Учётные записи создаёт администратор в Supabase, роли
        назначаются вручную. Этот экран пока не вызывает supabase.auth.
      </Text>
      <Text>
        {isSupabaseConfigured
          ? 'VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY заданы. Клиент создан, экраны к данным ещё не подключены.'
          : 'Скопируйте .env.example в .env.local и заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.'}
      </Text>
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <TextInput label="Эл. почта" name="email" type="email" autoComplete="username" />
          <PasswordInput label="Пароль" name="password" autoComplete="current-password" />
          <Button type="button" disabled>
            Войти
          </Button>
          <Text size="sm">Кнопка выключена: это заглушка маршрута /login.</Text>
        </Stack>
      </form>
    </Stack>
  )
}
