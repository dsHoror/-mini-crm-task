import { Alert, Button, Group, Modal, Stack, Textarea } from '@mantine/core'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { errorText } from '../lib/errors.ts'
import { hasErrors, validateRework, type FieldErrors } from '../lib/validation.ts'

export function ReworkModal({
  opened,
  onClose,
  onSubmit,
}: {
  opened: boolean
  onClose: () => void
  onSubmit: (comment: string) => Promise<void>
}) {
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<FieldErrors<'comment'>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const wasOpen = useRef(false)
  const started = useRef(false)

  useEffect(() => {
    if (opened && !wasOpen.current) {
      setComment('')
      setErrors({})
      setSubmitError(null)
      setPending(false)
      started.current = false
    }
    wasOpen.current = opened
  }, [opened])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateRework(comment)
    setErrors(nextErrors)
    setSubmitError(null)
    if (hasErrors(nextErrors) || started.current) return
    started.current = true
    setPending(true)
    try {
      await onSubmit(comment.trim())
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
      title="Вернуть на доработку"
      centered
      closeOnClickOutside={!pending}
      closeOnEscape={!pending}
    >
      <form noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Stack>
          <Textarea
            label="Комментарий"
            description="Без комментария вернуть задачу нельзя."
            name="comment"
            value={comment}
            onChange={(event) => setComment(event.currentTarget.value)}
            error={errors.comment}
            minRows={3}
            autosize
            required
            autoFocus
            disabled={pending}
          />
          {submitError ? (
            <Alert color="red" role="alert">
              {submitError}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" type="button" onClick={onClose} disabled={pending}>
              Отмена
            </Button>
            <Button type="submit" color="red" loading={pending}>
              На доработку
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
