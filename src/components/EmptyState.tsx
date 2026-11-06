import { Paper, Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <Paper withBorder radius="md" p="xl" ta="center">
      <Stack gap="xs" align="center">
        <Title order={4}>{title}</Title>
        {text ? (
          <Text c="dimmed" maw={420}>
            {text}
          </Text>
        ) : null}
        {action}
      </Stack>
    </Paper>
  )
}
