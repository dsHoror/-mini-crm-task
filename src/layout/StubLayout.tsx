import { Anchor, Group, Stack, Text, Title } from '@mantine/core'
import { Link, Outlet } from 'react-router-dom'
import { paths } from '../routes.ts'

export function StubLayout() {
  return (
    <Stack gap="md" p="md" maw={720}>
      <header>
        <Title order={1}>Объекты и задачи</Title>
        <Text c="dimmed">2B Studio. Каркас экранов, без рабочего интерфейса.</Text>
      </header>
      <nav aria-label="Разделы">
        <Group gap="md">
          <Anchor component={Link} to={paths.login}>
            Вход
          </Anchor>
          <Anchor component={Link} to={paths.objects}>
            Объекты
          </Anchor>
          <Anchor component={Link} to={paths.myTasks}>
            Мои задачи
          </Anchor>
        </Group>
      </nav>
      <Outlet />
    </Stack>
  )
}
