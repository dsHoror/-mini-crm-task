import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { errorText } from '../lib/errors.ts'
import { hasErrors, validateObject, type FieldErrors } from '../lib/validation.ts'

type ObjectFormValues = {
  name: string
  address: string
}

export function ObjectFormModal({
  opened,
  mode,
  initialName,
  initialAddress,
  onClose,
  onSubmit,
}: {
  opened: boolean
  mode: 'create' | 'edit'
  initialName: string
  initialAddress: string
  onClose: () => void
  onSubmit: (values: ObjectFormValues) => Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [address, setAddress] = useState(initialAddress)
  const [errors, setErrors] = useState<FieldErrors<'name' | 'address'>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const wasOpen = useRef(false)
  const started = useRef(false)

  useEffect(() => {
    if (opened && !wasOpen.current) {
      setName(initialName)
      setAddress(initialAddress)
      setErrors({})
      setSubmitError(null)
      setPending(false)
      started.current = false
    }
    wasOpen.current = opened
  }, [opened, initialName, initialAddress])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateObject(name, address)
    setErrors(nextErrors)
    setSubmitError(null)
    if (hasErrors(nextErrors) || started.current) return
    started.current = true
    setPending(true)
    try {
      await onSubmit({ name: name.trim(), address: address.trim() })
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
      title={mode === 'create' ? 'Новый объект' : 'Объект'}
      centered
      closeOnClickOutside={!pending}
      closeOnEscape={!pending}
    >
      <form noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Stack>
          <TextInput
            label="Название"
            name="name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            error={errors.name}
            required
            autoFocus
            disabled={pending}
          />
          <TextInput
            label="Адрес"
            name="address"
            value={address}
            onChange={(event) => setAddress(event.currentTarget.value)}
            error={errors.address}
            required
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
            <Button type="submit" loading={pending}>
              {mode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
