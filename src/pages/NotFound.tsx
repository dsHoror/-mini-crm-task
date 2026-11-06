import { Button } from '@mantine/core'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState.tsx'
import { paths } from '../routes.ts'

export function NotFound() {
  return (
    <EmptyState
      title="Такого экрана нет"
      text="Проверьте адрес или вернитесь к списку объектов."
      action={
        <Button component={Link} to={paths.objects}>
          К объектам
        </Button>
      }
    />
  )
}
