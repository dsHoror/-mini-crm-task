import { Alert, Button, Center, Loader, Paper, Stack } from '@mantine/core'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth.ts'
import { paths } from '../routes.ts'

export function RequireAuth() {
  const { loading, session, profile, profileError, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Center mih="100dvh" bg="gray.0">
        <Loader />
      </Center>
    )
  }

  if (!session) {
    return <Navigate to={paths.login} state={{ from: location }} replace />
  }

  if (!profile) {
    return (
      <Center mih="100dvh" bg="gray.0" p="md">
        <Paper withBorder shadow="sm" p="xl" maw={440} w="100%">
          <Stack>
            <Alert color="red" role="alert">
              {profileError ?? 'Профиль не найден'}
            </Alert>
            <Button onClick={() => void signOut()}>Выйти</Button>
          </Stack>
        </Paper>
      </Center>
    )
  }

  return <Outlet />
}
