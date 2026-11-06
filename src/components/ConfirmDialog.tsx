import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useRef, useState } from 'react'
import { errorText } from '../lib/errors.ts'

export function ConfirmDialog({
  opened,
  title,
  message,
  confirmLabel,
  confirmColor = 'red',
  onClose,
  onConfirm,
}: {
  opened: boolean
  title: string
  message: string
  confirmLabel: string
  confirmColor?: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      closeOnClickOutside
      closeOnEscape
    >
      {opened ? (
        <ConfirmBody
          message={message}
          confirmLabel={confirmLabel}
          confirmColor={confirmColor}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      ) : null}
    </Modal>
  )
}

function ConfirmBody({
  message,
  confirmLabel,
  confirmColor,
  onClose,
  onConfirm,
}: {
  message: string
  confirmLabel: string
  confirmColor: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  async function handleConfirm() {
    if (started.current) return
    started.current = true
    setPending(true)
    setError(null)
    try {
      await onConfirm()
    } catch (reason) {
      started.current = false
      setError(errorText(reason))
      setPending(false)
    }
  }

  return (
      <Stack>
        <Text>{message}</Text>
        {error ? (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={pending}>
            Отмена
          </Button>
          <Button color={confirmColor} onClick={() => void handleConfirm()} loading={pending}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
  )
}
