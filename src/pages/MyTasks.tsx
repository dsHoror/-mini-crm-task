import { Anchor, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { EmptyState } from '../components/EmptyState.tsx'
import { ErrorState, LoadingRows } from '../components/QueryState.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { loadMyTasks } from '../lib/api.ts'
import { useQuery } from '../lib/useQuery.ts'
import { paths } from '../routes.ts'

export function MyTasks() {
  const { profile } = useAuth()
  const userId = profile?.id ?? ''
  const query = useQuery(() => loadMyTasks(userId), [userId])
  const tasks = query.data?.tasks ?? []
  const objects = query.data?.objects ?? []

  return (
    <Stack component="section" gap="md" aria-labelledby="my-tasks-title">
      <Title id="my-tasks-title" order={2}>
        Мои задачи
      </Title>
      <Text size="sm" c="dimmed">
        Задачи, назначенные вам.
      </Text>

      {query.loading ? <LoadingRows /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.reload} /> : null}
      {query.refreshing ? (
        <Text size="xs" c="dimmed">
          Обновление…
        </Text>
      ) : null}

      {!query.loading && !query.error && tasks.length === 0 ? (
        <EmptyState
          title="Задач пока нет"
          text="Здесь появятся задачи, которые назначили вам."
          action={
            <Button component={Link} to={paths.objects} variant="default">
              К объектам
            </Button>
          }
        />
      ) : null}

      {tasks.length > 0 ? (
        <Stack gap="sm">
          {tasks.map((task) => {
            const objectName = objects.find((object) => object.id === task.object_id)?.name ?? 'Объект'
            return (
              <Anchor
                key={task.id}
                component={Link}
                to={paths.task(task.id)}
                className="crm-card"
                underline="never"
                c="inherit"
              >
                <Card withBorder padding="md" radius="md">
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Stack gap={4}>
                      <Text fw={600}>{task.title}</Text>
                      <Text size="sm" c="dimmed">
                        {objectName}
                      </Text>
                    </Stack>
                    <Group gap="xs" wrap="nowrap">
                      <StatusBadge status={task.status} />
                      <Text c="dimmed" aria-hidden="true">
                        ›
                      </Text>
                    </Group>
                  </Group>
                </Card>
              </Anchor>
            )
          })}
        </Stack>
      ) : null}
    </Stack>
  )
}
