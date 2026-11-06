import { Alert, Anchor, Button, Group, Paper, Stack, Text, Timeline, Title } from '@mantine/core'
import { type ReactNode, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { ErrorState, LoadingRows } from '../components/QueryState.tsx'
import { ReworkModal } from '../components/ReworkModal.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { TaskFormModal } from '../components/TaskFormModal.tsx'
import { changeTaskStatus, deleteTask, loadTaskPage, updateTask } from '../lib/api.ts'
import type { TaskStatus, TaskStatusHistoryRow, UserRole } from '../lib/database.types.ts'
import { errorText } from '../lib/errors.ts'
import { formatDateTime, STATUS_COLOR, STATUS_LABEL } from '../lib/labels.ts'
import { profileName } from '../lib/profiles.ts'
import { useQuery } from '../lib/useQuery.ts'
import { paths } from '../routes.ts'

type BusyAction = 'in_progress' | 'review' | 'accepted' | null

export function TaskDetail() {
  const { taskId = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const query = useQuery(() => loadTaskPage(taskId), [taskId])
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reworkOpen, setReworkOpen] = useState(false)
  const [busy, setBusy] = useState<BusyAction>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const pendingRef = useRef(false)

  const task = query.data?.task ?? null
  const object = query.data?.object ?? null
  const history = query.data?.history ?? []
  const profiles = query.data?.profiles ?? []
  const role = profile?.role

  async function move(toStatus: TaskStatus, comment: string | null, success: string) {
    if (!task || pendingRef.current) return
    pendingRef.current = true
    setBusy(toStatus === 'rework' ? null : (toStatus as BusyAction))
    setActionError(null)
    setNotice(null)
    try {
      await changeTaskStatus(task.id, toStatus, comment)
      setNotice(success)
      query.reload()
    } catch (reason) {
      setActionError(errorText(reason))
    } finally {
      pendingRef.current = false
      setBusy(null)
    }
  }

  return (
    <Stack component="section" gap="md" aria-labelledby="task-title">
      <Anchor component={Link} to={object ? paths.object(object.id) : paths.objects} size="sm">
        {object ? '← К объекту' : '← К объектам'}
      </Anchor>

      {query.loading ? <LoadingRows /> : null}
      {!query.loading && query.error && !query.data ? (
        <ErrorState message={query.error} onRetry={query.reload} />
      ) : null}
      {!query.loading && query.data && !task ? (
        <EmptyState
          title="Задача не найдена"
          text="Её нет или она назначена другому исполнителю."
          action={
            <Button component={Link} to={paths.objects}>
              К объектам
            </Button>
          }
        />
      ) : null}

      {task && role ? (
        <>
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Title id="task-title" order={2}>
                {task.title}
              </Title>
              <StatusBadge status={task.status} />
            </Stack>
            <TaskActions
              role={role}
              status={task.status}
              busy={busy}
              disabled={query.refreshing}
              onMove={(toStatus) => {
                const success =
                  toStatus === 'in_progress'
                    ? 'Задача взята в работу'
                    : toStatus === 'review'
                      ? 'Задача отправлена на проверку'
                      : 'Задача принята'
                void move(toStatus, null, success)
              }}
              onRework={() => setReworkOpen(true)}
              onEdit={() => setEditOpen(true)}
              onDelete={() => setDeleteOpen(true)}
            />
          </Group>

          {actionError ? (
            <Alert color="red" role="alert">
              {actionError}
            </Alert>
          ) : null}
          {notice ? (
            <Alert color="green" role="status">
              {notice}
            </Alert>
          ) : null}
          {query.error ? <ErrorState message={query.error} onRetry={query.reload} /> : null}
          <StatusNote status={task.status} history={history} />

          <Paper withBorder radius="md" p="md">
            <Stack gap="md">
              <Field label="Описание">
                <Text c={task.description ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-wrap' }}>
                  {task.description || 'Описание не указано'}
                </Text>
              </Field>
              <Field label="Исполнитель">
                <Text>{profileName(profiles, task.assignee_id)}</Text>
              </Field>
              <Field label="Объект">
                {object ? (
                  <Anchor component={Link} to={paths.object(object.id)}>
                    {object.name}
                  </Anchor>
                ) : (
                  <Text c="dimmed">Объект недоступен</Text>
                )}
                {object ? (
                  <Text size="sm" c="dimmed">
                    {object.address}
                  </Text>
                ) : null}
              </Field>
              <Field label="Автор">
                <Text>{profileName(profiles, task.author_id)}</Text>
              </Field>
              <Field label="Обновлена">
                <Text>{formatDateTime(task.updated_at)}</Text>
              </Field>
            </Stack>
          </Paper>

          <Stack gap="sm">
            <Title order={3}>История статусов</Title>
            {history.length === 0 ? (
              <Text c="dimmed" size="sm">
                Статус ещё не менялся.
              </Text>
            ) : (
              <Timeline active={history.length} bulletSize={16} lineWidth={2}>
                {history.map((row) => (
                  <Timeline.Item
                    key={row.id}
                    color={STATUS_COLOR[row.to_status]}
                    title={`${STATUS_LABEL[row.from_status]} → ${STATUS_LABEL[row.to_status]}`}
                  >
                    <Text size="sm" c="dimmed">
                      {profileName(profiles, row.changed_by)} · {formatDateTime(row.changed_at)}
                    </Text>
                    {row.comment ? (
                      <Text size="sm" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
                        {row.comment}
                      </Text>
                    ) : null}
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Stack>

          <TaskFormModal
            opened={editOpen}
            mode="edit"
            initialTitle={task.title}
            initialDescription={task.description ?? ''}
            initialAssigneeId={task.assignee_id}
            profiles={profiles}
            onClose={() => setEditOpen(false)}
            onSubmit={async (input) => {
              await updateTask(task.id, input)
              setEditOpen(false)
              setNotice('Задача сохранена')
              query.reload()
            }}
          />
          <ConfirmDialog
            opened={deleteOpen}
            title="Удалить задачу"
            message={`Удалить «${task.title}»? Если статус уже менялся, удалить задачу нельзя: история сохраняется.`}
            confirmLabel="Удалить"
            onClose={() => setDeleteOpen(false)}
            onConfirm={async () => {
              await deleteTask(task.id)
              navigate(object ? paths.object(object.id) : paths.objects)
            }}
          />
          <ReworkModal
            opened={reworkOpen}
            onClose={() => setReworkOpen(false)}
            onSubmit={async (comment) => {
              await changeTaskStatus(task.id, 'rework', comment)
              setReworkOpen(false)
              setNotice('Задача возвращена на доработку')
              setActionError(null)
              query.reload()
            }}
          />
        </>
      ) : null}
    </Stack>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" fw={700} tt="uppercase">
        {label}
      </Text>
      {children}
    </Stack>
  )
}

function StatusNote({ status, history }: { status: TaskStatus; history: TaskStatusHistoryRow[] }) {
  if (status === 'rework') {
    const comment = history.find((row) => row.to_status === 'rework' && row.comment)?.comment
    return (
      <Alert color="red" title="На доработке" role="status">
        {comment ?? 'Постановщик вернул задачу. Комментарий смотрите в истории.'}
      </Alert>
    )
  }
  if (status === 'review') {
    return (
      <Alert color="blue" role="status">
        Задача на проверке у постановщика.
      </Alert>
    )
  }
  if (status === 'accepted') {
    return (
      <Alert color="green" role="status">
        Задача принята.
      </Alert>
    )
  }
  return null
}

function TaskActions({
  role,
  status,
  busy,
  disabled,
  onMove,
  onRework,
  onEdit,
  onDelete,
}: {
  role: UserRole
  status: TaskStatus
  busy: BusyAction
  disabled: boolean
  onMove: (status: 'in_progress' | 'review' | 'accepted') => void
  onRework: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const locked = disabled || busy !== null

  if (role === 'manager' && status === 'new') {
    return (
      <Group gap="xs">
        <Button variant="default" onClick={onEdit} disabled={locked}>
          Изменить
        </Button>
        <Button color="red" variant="light" onClick={onDelete} disabled={locked}>
          Удалить
        </Button>
      </Group>
    )
  }

  if (role === 'manager' && status === 'review') {
    return (
      <Group gap="xs">
        <Button variant="default" color="red" onClick={onRework} disabled={locked}>
          На доработку
        </Button>
        <Button color="green" onClick={() => onMove('accepted')} loading={busy === 'accepted'} disabled={disabled}>
          Принять
        </Button>
      </Group>
    )
  }

  if (role === 'executor' && (status === 'new' || status === 'rework')) {
    return (
      <Button onClick={() => onMove('in_progress')} loading={busy === 'in_progress'} disabled={disabled}>
        Взять в работу
      </Button>
    )
  }

  if (role === 'executor' && status === 'in_progress') {
    return (
      <Button onClick={() => onMove('review')} loading={busy === 'review'} disabled={disabled}>
        Отправить на проверку
      </Button>
    )
  }

  return (
    <Text size="sm" c="dimmed">
      {waitingCopy(role, status)}
    </Text>
  )
}

function waitingCopy(role: UserRole, status: TaskStatus): string {
  if (role === 'executor' && status === 'review') return 'Дождитесь решения постановщика.'
  if (status === 'accepted') return 'Дальнейших действий нет.'
  if (role === 'manager' && status === 'in_progress') return 'Исполнитель ведёт задачу.'
  if (role === 'manager' && status === 'rework') return 'Ждём, пока исполнитель снова возьмёт задачу в работу.'
  return 'Сейчас действий нет.'
}
