export type FieldErrors<Key extends string> = Partial<Record<Key, string>>

const NAME_MAX = 200
const ADDRESS_MAX = 300
const TITLE_MAX = 200
const TEXT_MAX = 4000

function requiredText(value: string, emptyMessage: string, max: number): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return emptyMessage
  if (trimmed.length > max) return `Не длиннее ${max} символов`
  return undefined
}

export function validateLogin(email: string, password: string): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {}
  const trimmed = email.trim()
  if (!trimmed) errors.email = 'Укажите почту'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) errors.email = 'Почта выглядит неверно'
  else if (trimmed.length > 320) errors.email = 'Почта слишком длинная'

  if (!password) errors.password = 'Укажите пароль'
  else if (password.length < 6) errors.password = 'Пароль не короче 6 символов'

  return errors
}

export function validateObject(name: string, address: string): FieldErrors<'name' | 'address'> {
  const errors: FieldErrors<'name' | 'address'> = {}
  const nameError = requiredText(name, 'Укажите название', NAME_MAX)
  const addressError = requiredText(address, 'Укажите адрес', ADDRESS_MAX)
  if (nameError) errors.name = nameError
  if (addressError) errors.address = addressError
  return errors
}

export function validateTask(
  title: string,
  description: string,
): FieldErrors<'title' | 'description'> {
  const errors: FieldErrors<'title' | 'description'> = {}
  const titleError = requiredText(title, 'Укажите название задачи', TITLE_MAX)
  if (titleError) errors.title = titleError
  if (description.trim().length > TEXT_MAX) errors.description = `Не длиннее ${TEXT_MAX} символов`
  return errors
}

export function validateRework(comment: string): FieldErrors<'comment'> {
  const errors: FieldErrors<'comment'> = {}
  const commentError = requiredText(comment, 'Напишите, что нужно исправить', TEXT_MAX)
  if (commentError) errors.comment = commentError
  return errors
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0
}

export function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}
