import { Anchor, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { ObjectFormModal } from '../components/ObjectFormModal.tsx'
import { PrimaryAction } from '../components/PrimaryAction.tsx'
import { ErrorState, LoadingRows } from '../components/QueryState.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { TaskFormModal } from '../components/TaskFormModal.tsx'
import {
  createTask,
  deleteObject,
  loadObjectPage,
  updateObject,
  updateTask,
  type TaskInput,
} from '../lib/api.ts'
import type { TaskRow } from '../lib/database.types.ts'
import { profileName } from '../lib/profiles.ts'
import { useQuery } from '../lib/useQuery.ts'
import { paths } from '../routes.ts'

export function ObjectDetail() {
  const { objectId = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const query = useQuery(() => loadObjectPage(objectId), [objectId])
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [taskEditor, setTaskEditor] = useState<TaskRow | 'create' | null>(null)
  const isManager = profile?.role === 'manager'
  const object = query.data?.object ?? null
  const tasks = query.data?.tasks ?? []
  const profiles = query.data?.profiles ?? []
  const editingTask = taskEditor && taskEditor !== 'create' ? taskEditor : null

  async function saveTask(input: TaskInput) {
    if (!object) return
    if (taskEditor === 'create') await createTask(object.id, input)
    else if (editingTask) await updateTask(editingTask.id, input)
    setTaskEditor(null)
    query.reload()
  }

  return (
    <Stack component="section" gap="md" aria-labelledby="object-title">
      <Anchor component={Link} to={paths.objects} size="sm">
        ← К объектам
      </Anchor>

      {query.loading ? <LoadingRows /> : null}
      {!query.loading && query.error && !query.data ? (
        <ErrorState message={query.error} onRetry={query.reload} />
      ) : null}
      {!query.loading && query.data && !object ? (
        <EmptyState
          title="Объект не найден"
          text="Его нет или у вас нет к нему доступа."
          action={
            <Button component={Link} to={paths.objects}>
              К объектам
            </Button>
          }
        />
      ) : null}

      {object ? (
        <>
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Title id="object-title" order={2}>
                {object.name}
              </Title>
              <Text c="dimmed">{object.address}</Text>
            </Stack>
            {isManager ? (
              <Group gap="xs">
                <Button variant="default" onClick={() => setEditOpen(true)}>
                  Изменить
                </Button>
                <Button color="red" variant="light" onClick={() => setDeleteOpen(true)}>
                  Удалить
                </Button>
              </Group>
            ) : null}
          </Group>

          {query.error ? <ErrorState message={query.error} onRetry={query.reload} /> : null}
          {query.refreshing ? (
            <Text size="xs" c="dimmed">
              Обновление…
            </Text>
          ) : null}

          <Group justify="space-between" align="center">
            <Title order={3}>Задачи</Title>
            {isManager ? (
              <PrimaryAction label="Новая задача" onClick={() => setTaskEditor('create')} />
            ) : null}
          </Group>
          {!isManager ? (
            <Text size="sm" c="dimmed">
              Показаны только ваши задачи.
            </Text>
          ) : null}

          {tasks.length === 0 ? (
            <EmptyState
              title="Задач пока нет"
              text={isManager ? 'Добавьте задачу и назначьте исполнителя.' : 'На этом объекте нет ваших задач.'}
              action={
                isManager ? (
                  <Button onClick={() => setTaskEditor('create')}>Новая задача</Button>
                ) : undefined
              }
            />
          ) : (
            <Stack gap="sm">
              {tasks.map((task) => (
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
                          {profileName(profiles, task.assignee_id)}
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
              ))}
            </Stack>
          )}

          <ObjectFormModal
            opened={editOpen}
            mode="edit"
            initialName={object.name}
            initialAddress={object.address}
            onClose={() => setEditOpen(false)}
            onSubmit={async (values) => {
              await updateObject(object.id, values)
              setEditOpen(false)
              query.reload()
            }}
          />
          <ConfirmDialog
            opened={deleteOpen}
            title="Удалить объект"
            message={`Удалить «${object.name}»? Пока на объекте есть задачи, удалить его нельзя.`}
            confirmLabel="Удалить"
            onClose={() => setDeleteOpen(false)}
            onConfirm={async () => {
              await deleteObject(object.id)
              navigate(paths.objects)
            }}
          />
          {isManager ? (
            <TaskFormModal
              opened={taskEditor !== null}
              mode={taskEditor === 'create' ? 'create' : 'edit'}
              initialTitle={editingTask?.title ?? ''}
              initialDescription={editingTask?.description ?? ''}
              initialAssigneeId={editingTask?.assignee_id ?? null}
              profiles={profiles}
              onClose={() => setTaskEditor(null)}
              onSubmit={saveTask}
            />
          ) : null}
        </>
      ) : null}
    </Stack>
  )
}
