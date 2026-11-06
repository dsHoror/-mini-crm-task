import { Badge } from '@mantine/core'
import type { TaskStatus } from '../lib/database.types.ts'
import { STATUS_COLOR, STATUS_LABEL } from '../lib/labels.ts'

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="light" color={STATUS_COLOR[status]} radius="xl">
      {STATUS_LABEL[status]}
    </Badge>
  )
}
