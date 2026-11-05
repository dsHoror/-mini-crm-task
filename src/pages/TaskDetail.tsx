import { Stack, Text, Title } from '@mantine/core'
import { useParams } from 'react-router-dom'

export function TaskDetail() {
  const { taskId } = useParams()

  if (!taskId) {
    return <Text>Не указан идентификатор задачи.</Text>
  }

  return (
    <Stack gap="sm" component="section" aria-labelledby="task-title">
      <Title id="task-title" order={2}>
        Задача {taskId}
      </Title>
      <Text>
        Смена статуса пойдёт только через RPC change_task_status. Прямое обновление колонки status
        закрыто.
      </Text>
    </Stack>
  )
}
