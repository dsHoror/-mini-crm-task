import { Alert, Button, Group, Modal, Select, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { ProfileRow } from '../lib/database.types.ts'
import { errorText } from '../lib/errors.ts'
import { executorOptions } from '../lib/profiles.ts'
import {
  blankToNull,
  hasErrors,
  TASK_TITLE_MAX,
  validateTask,
  type FieldErrors,
} from '../lib/validation.ts'
import type { TaskInput } from '../lib/api.ts'

export function TaskFormModal({
  opened,
  mode,
  initialTitle,
  initialDescription,
  initialAssigneeId,
  profiles,
  onClose,
  onSubmit,
}: {
  opened: boolean
  mode: 'create' | 'edit'
  initialTitle: string
  initialDescription: string
  initialAssigneeId: string | null
  profiles: ProfileRow[]
  onClose: () => void
  onSubmit: (values: TaskInput) => Promise<void>
}) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [assigneeId, setAssigneeId] = useState<string | null>(initialAssigneeId)
  const [errors, setErrors] = useState<FieldErrors<'title' | 'description'>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const wasOpen = useRef(false)
  const started = useRef(false)
  const options = executorOptions(profiles, initialAssigneeId)

  useEffect(() => {
    if (opened && !wasOpen.current) {
      setTitle(initialTitle)
      setDescription(initialDescription)
      setAssigneeId(initialAssigneeId)
      setErrors({})
      setSubmitError(null)
      setPending(false)
      started.current = false
    }
    wasOpen.current = opened
  }, [opened, initialTitle, initialDescription, initialAssigneeId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateTask(title, description)
    setErrors(nextErrors)
    setSubmitError(null)
    if (hasErrors(nextErrors) || started.current) return
    started.current = true
    setPending(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: blankToNull(description),
        assigneeId,
      })
    } catch (reason) {
      started.current = false
      setSubmitError(errorText(reason))
      setPending(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'create' ? 'Новая задача' : 'Задача'}
      centered
      closeOnClickOutside={!pending}
      closeOnEscape={!pending}
    >
      <form noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Stack>
          <TextInput
            label="Название"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            error={errors.title}
            required
            autoFocus
            maxLength={TASK_TITLE_MAX}
            disabled={pending}
          />
          <Textarea
            label="Описание"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            error={errors.description}
            minRows={3}
            autosize
            disabled={pending}
          />
          <Select
            label="Исполнитель"
            placeholder="Не назначен"
            data={options}
            value={assigneeId}
            onChange={setAssigneeId}
            clearable
            searchable
            nothingFoundMessage="Нет исполнителей"
            disabled={pending}
          />
          {options.length === 0 ? (
            <Text size="sm" c="dimmed">
              Исполнителей пока нет. Задачу можно сохранить без назначения.
            </Text>
          ) : null}
          {submitError ? (
            <Alert color="red" role="alert">
              {submitError}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" type="button" onClick={onClose} disabled={pending}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              {mode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
