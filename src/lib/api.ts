import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  ObjectRow,
  ProfileRow,
  TaskRow,
  TaskStatus,
  TaskStatusHistoryRow,
} from './database.types.ts'
import { supabase } from './supabase.ts'

export type ObjectListItem = ObjectRow & { taskCount: number }

export type ObjectPageData = {
  object: ObjectRow | null
  tasks: TaskRow[]
  profiles: ProfileRow[]
}

export type TaskPageData = {
  task: TaskRow | null
  object: ObjectRow | null
  history: TaskStatusHistoryRow[]
  profiles: ProfileRow[]
}

export type MyTasksData = {
  tasks: TaskRow[]
  objects: ObjectRow[]
}

export type ObjectInput = {
  name: string
  address: string
}

export type TaskInput = {
  title: string
  description: string | null
  assigneeId: string | null
}

function client(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Сервис входа не настроен')
  }
  return supabase
}

function isBadUuid(code: string | undefined): boolean {
  return code === '22P02'
}

function ensureWritten(count: number | null | undefined): void {
  if (!count) {
    throw new Error('row-level security')
  }
}

export async function listObjects(): Promise<ObjectListItem[]> {
  const db = client()
  const [objectsResult, tasksResult] = await Promise.all([
    db.from('objects').select('*').order('name', { ascending: true }),
    db.from('tasks').select('object_id'),
  ])
  if (objectsResult.error) throw objectsResult.error
  if (tasksResult.error) throw tasksResult.error

  const counts = new Map<string, number>()
  for (const task of tasksResult.data) {
    counts.set(task.object_id, (counts.get(task.object_id) ?? 0) + 1)
  }

  return objectsResult.data.map((object) => ({
    ...object,
    taskCount: counts.get(object.id) ?? 0,
  }))
}

export async function loadObjectPage(objectId: string): Promise<ObjectPageData> {
  const db = client()
  const [objectResult, tasksResult, profilesResult] = await Promise.all([
    db.from('objects').select('*').eq('id', objectId).maybeSingle(),
    db.from('tasks').select('*').eq('object_id', objectId).order('created_at', { ascending: true }),
    db.from('profiles').select('*').order('full_name', { ascending: true }),
  ])

  if (objectResult.error) {
    if (isBadUuid(objectResult.error.code)) return { object: null, tasks: [], profiles: [] }
    throw objectResult.error
  }
  if (tasksResult.error) {
    if (isBadUuid(tasksResult.error.code)) return { object: objectResult.data, tasks: [], profiles: [] }
    throw tasksResult.error
  }
  if (profilesResult.error) throw profilesResult.error

  return {
    object: objectResult.data,
    tasks: objectResult.data ? tasksResult.data : [],
    profiles: profilesResult.data,
  }
}

export async function loadTaskPage(taskId: string): Promise<TaskPageData> {
  const db = client()
  const [taskResult, historyResult, profilesResult, objectsResult] = await Promise.all([
    db.from('tasks').select('*').eq('id', taskId).maybeSingle(),
    db
      .from('task_status_history')
      .select('*')
      .eq('task_id', taskId)
      .order('changed_at', { ascending: false }),
    db.from('profiles').select('*').order('full_name', { ascending: true }),
    db.from('objects').select('*'),
  ])

  if (taskResult.error) {
    if (isBadUuid(taskResult.error.code)) {
      return { task: null, object: null, history: [], profiles: [] }
    }
    throw taskResult.error
  }
  if (historyResult.error && !isBadUuid(historyResult.error.code)) throw historyResult.error
  if (profilesResult.error) throw profilesResult.error
  if (objectsResult.error) throw objectsResult.error
  const task = taskResult.data
  if (!task) {
    return { task: null, object: null, history: [], profiles: profilesResult.data ?? [] }
  }

  const object = objectsResult.data.find((item) => item.id === task.object_id) ?? null

  return {
    task,
    object,
    history: historyResult.data ?? [],
    profiles: profilesResult.data,
  }
}

export async function loadMyTasks(userId: string): Promise<MyTasksData> {
  const db = client()
  const [tasksResult, objectsResult] = await Promise.all([
    db
      .from('tasks')
      .select('*')
      .eq('assignee_id', userId)
      .order('updated_at', { ascending: false }),
    db.from('objects').select('*'),
  ])
  if (tasksResult.error) throw tasksResult.error
  if (objectsResult.error) throw objectsResult.error
  return { tasks: tasksResult.data, objects: objectsResult.data }
}

export async function createObject(input: ObjectInput): Promise<void> {
  const { data, error } = await client()
    .from('objects')
    .insert({ name: input.name, address: input.address })
    .select('id')
  if (error) throw error
  ensureWritten(data?.length)
}

export async function updateObject(id: string, input: ObjectInput): Promise<void> {
  const { data, error } = await client()
    .from('objects')
    .update({ name: input.name, address: input.address })
    .eq('id', id)
    .select('id')
  if (error) throw error
  ensureWritten(data?.length)
}

export async function deleteObject(id: string): Promise<void> {
  const { data, error } = await client().from('objects').delete().eq('id', id).select('id')
  if (error) throw error
  ensureWritten(data?.length)
}

export async function createTask(objectId: string, input: TaskInput): Promise<void> {
  const { data, error } = await client()
    .from('tasks')
    .insert({
      object_id: objectId,
      title: input.title,
      description: input.description,
      assignee_id: input.assigneeId,
    })
    .select('id')
  if (error) throw error
  ensureWritten(data?.length)
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const { data, error } = await client()
    .from('tasks')
    .update({
      title: input.title,
      description: input.description,
      assignee_id: input.assigneeId,
    })
    .eq('id', id)
    .select('id')
  if (error) throw error
  ensureWritten(data?.length)
}

export async function deleteTask(id: string): Promise<void> {
  const { data, error } = await client().from('tasks').delete().eq('id', id).select('id')
  if (error) throw error
  ensureWritten(data?.length)
}

// tasks.status is not granted to the client. Every transition goes through the RPC,
// which also appends task_status_history.
export async function changeTaskStatus(
  taskId: string,
  toStatus: TaskStatus,
  comment: string | null,
): Promise<void> {
  const { error } = await client().rpc('change_task_status', {
    p_task_id: taskId,
    p_to_status: toStatus,
    p_comment: comment,
  })
  if (error) throw error
}
