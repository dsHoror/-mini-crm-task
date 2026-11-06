import { Anchor, Stack, Text, Title } from '@mantine/core'
import { Link, useParams } from 'react-router-dom'
import { paths } from '../routes.ts'

export function ObjectDetail() {
  const { objectId } = useParams()

  if (!objectId) {
    return <Text>Не указан идентификатор объекта.</Text>
  }

  return (
    <Stack gap="sm" component="section" aria-labelledby="object-title">
      <Title id="object-title" order={2}>
        Объект {objectId}
      </Title>
      <Text>Карточка объекта и список его задач. Данные из Supabase ещё не читаются.</Text>
      <Anchor component={Link} to={paths.task('demo')}>
        Открыть задачу (заглушка)
      </Anchor>
    </Stack>
  )
}
