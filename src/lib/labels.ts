import type { TaskStatus, UserRole } from './database.types.ts'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  rework: 'На доработке',
  accepted: 'Принята',
}

export const STATUS_COLOR: Record<TaskStatus, string> = {
  new: 'gray',
  in_progress: 'yellow',
  review: 'blue',
  rework: 'red',
  accepted: 'green',
}

export const ROLE_LABEL: Record<UserRole, string> = {
  manager: 'Постановщик',
  executor: 'Исполнитель',
}

export function tasksCountLabel(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} задачи`
  return `${count} задач`
}

export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
