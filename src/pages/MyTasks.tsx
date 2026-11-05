import { Stack, Text, Title } from '@mantine/core'

export function MyTasks() {
  const headingId = 'my-tasks-title'

  return (
    <Stack gap="sm" component="section" aria-labelledby={headingId}>
      <Title id={headingId} order={2}>
        Мои задачи
      </Title>
      <Text>Задачи, у которых assignee_id совпадает с текущим пользователем.</Text>
    </Stack>
  )
}
