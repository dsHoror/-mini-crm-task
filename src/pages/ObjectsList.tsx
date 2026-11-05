import { Anchor, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import { paths } from '../routes.ts'

export function ObjectsList() {
  return (
    <Stack gap="sm" component="section" aria-labelledby="objects-title">
      <Title id="objects-title" order={2}>
        Объекты
      </Title>
      <Text>
        Здесь будет список объектов. Менеджер видит все, исполнитель — только те, где у него есть
        задачи.
      </Text>
      <Anchor component={Link} to={paths.object('demo')}>
        Открыть карточку объекта (заглушка)
      </Anchor>
    </Stack>
  )
}
