import {
  Alert,
  Button,
  Center,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { hasErrors, validateLogin, type FieldErrors } from '../lib/validation.ts'
import { paths } from '../routes.ts'

export function Login() {
  const { configured, loading, session, profile, profileError, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (session && profile) return <Navigate to={paths.objects} replace />

  if (loading || (session && !profile && !profileError)) {
    return (
      <Center mih="100dvh" bg="gray.0">
        <Loader />
      </Center>
    )
  }

  if (session && profileError) {
    return (
      <Center mih="100dvh" bg="gray.0" p="md">
        <Paper withBorder shadow="sm" p="xl" maw={440} w="100%">
          <Stack>
            <Alert color="red" role="alert">
              {profileError}
            </Alert>
            <Button onClick={() => void signOut()}>Выйти</Button>
          </Stack>
        </Paper>
      </Center>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateLogin(email, password)
    setErrors(nextErrors)
    setFormError(null)
    if (hasErrors(nextErrors)) return
    if (!configured) {
      setFormError('Сервис входа не настроен. Обратитесь к администратору.')
      return
    }
    setPending(true)
    const message = await signIn(email, password)
    if (message) {
      setFormError(message)
      setPending(false)
    }
  }

  return (
    <Center mih="100dvh" bg="gray.0" p="md">
      <Paper
        component="section"
        w="100%"
        maw={400}
        p="xl"
        radius="md"
        withBorder
        shadow="sm"
        aria-labelledby="login-title"
      >
        <Stack align="center" gap="xs" mb="lg">
          <ThemeIcon radius="md" size="lg" aria-hidden="true">
            2B
          </ThemeIcon>
          <Title id="login-title" order={3}>
            Объекты и задачи
          </Title>
          <Text size="sm" c="dimmed">
            Вход для сотрудников. Регистрации нет.
          </Text>
        </Stack>
        <form noValidate onSubmit={(event) => void handleSubmit(event)}>
          <Stack>
            {!configured ? (
              <Alert color="yellow" title="Вход недоступен" role="status">
                Сервис входа не настроен. Обратитесь к администратору.
              </Alert>
            ) : null}
            {formError ? (
              <Alert color="red" role="alert">
                {formError}
              </Alert>
            ) : null}
            <TextInput
              label="Эл. почта"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              error={errors.email}
              required
              disabled={pending}
            />
            <PasswordInput
              label="Пароль"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              error={errors.password}
              required
              disabled={pending}
            />
            <Button type="submit" fullWidth loading={pending}>
              Войти
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
