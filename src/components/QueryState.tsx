import { Alert, Button, Skeleton, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'

export function LoadingRows() {
  return (
    <Stack gap="sm" aria-busy="true" aria-live="polite">
      <Skeleton height={76} radius="md" />
      <Skeleton height={76} radius="md" />
      <Skeleton height={76} radius="md" />
    </Stack>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert color="red" title="Не получилось загрузить данные" role="alert">
      <Stack gap="sm">
        <Text size="sm">{message}</Text>
        {onRetry ? (
          <Button variant="light" color="red" onClick={onRetry} w="fit-content">
            Повторить
          </Button>
        ) : null}
      </Stack>
    </Alert>
  )
}

export function QueryGate({
  loading,
  error,
  onRetry,
  empty,
  isEmpty,
  children,
}: {
  loading: boolean
  error: string | null
  onRetry?: () => void
  empty?: ReactNode
  isEmpty?: boolean
  children: ReactNode
}) {
  if (loading) return <LoadingRows />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (isEmpty) return empty ?? null
  return children
}
