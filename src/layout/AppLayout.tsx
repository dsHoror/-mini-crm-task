import {
  Anchor,
  AppShell,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { ROLE_LABEL } from '../lib/labels.ts'
import { paths } from '../routes.ts'

function navActive(pathname: string, key: 'objects' | 'my-tasks'): boolean {
  if (key === 'my-tasks') return pathname === paths.myTasks
  return pathname === paths.objects || pathname.startsWith('/objects/')
}

export function AppLayout() {
  const { profile, session, signOut } = useAuth()
  const location = useLocation()
  const [moreOpened, { open: openMore, close: closeMore }] = useDisclosure(false)
  const [leaving, setLeaving] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const objectsActive = navActive(location.pathname, 'objects')
  const myTasksActive = navActive(location.pathname, 'my-tasks')

  useEffect(() => {
    window.scrollTo(0, 0)
    closeMore()
    // closeMore is stable in useDisclosure; pathname is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  if (!profile) return null

  async function handleSignOut() {
    setLeaving(true)
    setSignOutError(null)
    const message = await signOut()
    if (message) {
      setSignOutError(message)
      setLeaving(false)
    }
  }

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <Anchor component={Link} to={paths.objects} underline="never" c="dark">
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon radius="md" size="md" aria-hidden="true">
                  2B
                </ThemeIcon>
                <Text fw={700} visibleFrom="xs">
                  Объекты и задачи
                </Text>
              </Group>
            </Anchor>
            <Group gap="xs" visibleFrom="sm" component="nav" aria-label="Разделы">
              <Button
                component={Link}
                to={paths.objects}
                variant={objectsActive ? 'light' : 'subtle'}
                color={objectsActive ? 'blue' : 'gray'}
                aria-current={objectsActive ? 'page' : undefined}
              >
                Объекты
              </Button>
              <Button
                component={Link}
                to={paths.myTasks}
                variant={myTasksActive ? 'light' : 'subtle'}
                color={myTasksActive ? 'blue' : 'gray'}
                aria-current={myTasksActive ? 'page' : undefined}
              >
                Мои задачи
              </Button>
            </Group>
          </Group>
          <Group gap="sm" visibleFrom="sm" wrap="nowrap">
            <Text size="sm" fw={500} truncate maw={220}>
              {profile.full_name}
            </Text>
            <Badge variant="light">{ROLE_LABEL[profile.role]}</Badge>
            <Button variant="subtle" color="gray" onClick={() => void handleSignOut()} loading={leaving}>
              Выйти
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Box className="app-content">
          {signOutError ? (
            <Text c="red" size="sm" mb="sm" role="alert">
              {signOutError}
            </Text>
          ) : null}
          <Outlet />
        </Box>
      </AppShell.Main>
      <Box component="nav" className="tabbar" aria-label="Разделы">
        <UnstyledButton
          component={Link}
          to={paths.objects}
          className={objectsActive ? 'tab is-active' : 'tab'}
          aria-current={objectsActive ? 'page' : undefined}
        >
          Объекты
        </UnstyledButton>
        <UnstyledButton
          component={Link}
          to={paths.myTasks}
          className={myTasksActive ? 'tab is-active' : 'tab'}
          aria-current={myTasksActive ? 'page' : undefined}
        >
          Мои задачи
        </UnstyledButton>
        <UnstyledButton className={moreOpened ? 'tab is-active' : 'tab'} onClick={openMore}>
          Ещё
        </UnstyledButton>
      </Box>
      <Drawer opened={moreOpened} onClose={closeMore} position="bottom" title="Ещё" padding="md">
        <Stack>
          <div>
            <Text fw={600}>{profile.full_name}</Text>
            <Text size="sm" c="dimmed">
              {session?.user.email}
            </Text>
          </div>
          <Badge variant="light" w="fit-content">
            {ROLE_LABEL[profile.role]}
          </Badge>
          {signOutError ? (
            <Text c="red" size="sm" role="alert">
              {signOutError}
            </Text>
          ) : null}
          <Button color="red" variant="light" onClick={() => void handleSignOut()} loading={leaving}>
            Выйти
          </Button>
        </Stack>
      </Drawer>
    </AppShell>
  )
}
