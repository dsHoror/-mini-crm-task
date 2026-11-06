function readError(error: unknown): { message: string; code: string } {
  if (typeof error === 'string') return { message: error, code: '' }
  if (error instanceof Error) return { message: error.message, code: '' }
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; code?: unknown }
    return {
      message: typeof record.message === 'string' ? record.message : '',
      code: typeof record.code === 'string' ? record.code : '',
    }
  }
  return { message: '', code: '' }
}

export function errorText(error: unknown): string {
  const { message, code } = readError(error)
  const haystack = `${code} ${message}`.toLowerCase()

  if (haystack.includes('invalid login') || haystack.includes('invalid_credentials')) {
    return 'Неверная почта или пароль'
  }
  if (haystack.includes('email not confirmed')) {
    return 'Почта не подтверждена. Обратитесь к администратору'
  }
  if (haystack.includes('comment is required for rework')) {
    return 'Комментарий обязателен для возврата на доработку'
  }
  if (haystack.includes('forbidden transition')) {
    return 'Этот переход статуса недоступен'
  }
  if (haystack.includes('only the assignee')) {
    return 'Менять статус может только исполнитель этой задачи'
  }
  if (haystack.includes('not authenticated') || haystack.includes('jwt')) {
    return 'Сессия истекла. Войдите снова'
  }
  if (haystack.includes('task not found') || code === 'P0002') {
    return 'Задача не найдена'
  }
  if (haystack.includes('profile not found')) {
    return 'Профиль не найден'
  }
  if (haystack.includes('row-level security') || haystack.includes('permission denied') || code === '42501') {
    return 'Недостаточно прав для этого действия'
  }
  if (
    haystack.includes('failed to fetch') ||
    haystack.includes('network') ||
    haystack.includes('fetch failed')
  ) {
    return 'Нет связи с сервером. Проверьте подключение'
  }
  if (haystack.includes('сервис входа не настроен') || haystack.includes('vite_supabase')) {
    return 'Сервис входа не настроен. Обратитесь к администратору.'
  }
  if (haystack.includes('status can only be changed')) {
    return 'Не удалось сменить статус'
  }
  if (code === '23514') {
    return 'Проверьте поля формы'
  }

  return 'Не удалось выполнить действие. Попробуйте ещё раз'
}
