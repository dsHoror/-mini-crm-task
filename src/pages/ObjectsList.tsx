import { Anchor, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { EmptyState } from '../components/EmptyState.tsx'
import { ObjectFormModal } from '../components/ObjectFormModal.tsx'
import { PrimaryAction } from '../components/PrimaryAction.tsx'
import { ErrorState, LoadingRows } from '../components/QueryState.tsx'
import { createObject, listObjects } from '../lib/api.ts'
import { tasksCountLabel } from '../lib/labels.ts'
import { useQuery } from '../lib/useQuery.ts'
import { paths } from '../routes.ts'

export function ObjectsList() {
  const { profile } = useAuth()
  const query = useQuery(() => listObjects(), [])
  const [createOpen, setCreateOpen] = useState(false)
  const isManager = profile?.role === 'manager'
  const objects = query.data ?? []

  return (
    <Stack component="section" gap="md" aria-labelledby="objects-title">
      <Group justify="space-between" align="center">
        <Title id="objects-title" order={2}>
          Объекты
        </Title>
        {isManager ? <PrimaryAction label="Новый объект" onClick={() => setCreateOpen(true)} /> : null}
      </Group>

      {query.loading ? <LoadingRows /> : null}
      {query.error && !query.data ? <ErrorState message={query.error} onRetry={query.reload} /> : null}
      {query.error && query.data ? <ErrorState message={query.error} onRetry={query.reload} /> : null}
      {query.refreshing ? (
        <Text size="xs" c="dimmed">
          Обновление…
        </Text>
      ) : null}

      {!query.loading && !query.error && objects.length === 0 ? (
        <EmptyState
          title="Объектов пока нет"
          text={
            isManager
              ? 'Создайте первый объект, чтобы ставить по нему задачи.'
              : 'Пока нет объектов с вашими задачами.'
          }
          action={
            isManager ? <Button onClick={() => setCreateOpen(true)}>Новый объект</Button> : undefined
          }
        />
      ) : null}

      {!query.loading && objects.length > 0 ? (
        <Stack gap="sm">
          {objects.map((object) => (
            <Anchor
              key={object.id}
              component={Link}
              to={paths.object(object.id)}
              className="crm-card"
              underline="never"
              c="inherit"
            >
              <Card withBorder padding="md" radius="md">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Stack gap={4}>
                    <Text fw={600}>{object.name}</Text>
                    <Text size="sm" c="dimmed">
                      {object.address} · {tasksCountLabel(object.taskCount)}
                    </Text>
                  </Stack>
                  <Text c="dimmed" aria-hidden="true">
                    ›
                  </Text>
                </Group>
              </Card>
            </Anchor>
          ))}
        </Stack>
      ) : null}

      {isManager ? (
        <ObjectFormModal
          opened={createOpen}
          mode="create"
          initialName=""
          initialAddress=""
          onClose={() => setCreateOpen(false)}
          onSubmit={async (values) => {
            await createObject(values)
            setCreateOpen(false)
            query.reload()
          }}
        />
      ) : null}
    </Stack>
  )
}
