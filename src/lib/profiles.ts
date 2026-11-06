import type { ProfileRow } from './database.types.ts'

export function profileName(profiles: ProfileRow[], id: string | null): string {
  if (!id) return 'Не назначен'
  return profiles.find((profile) => profile.id === id)?.full_name ?? 'Неизвестно'
}

export function executorOptions(profiles: ProfileRow[], currentAssigneeId: string | null) {
  return profiles
    .filter((profile) => profile.role === 'executor' || profile.id === currentAssigneeId)
    .map((profile) => ({
      value: profile.id,
      label: profile.role === 'executor' ? profile.full_name : `${profile.full_name} (не исполнитель)`,
    }))
}
