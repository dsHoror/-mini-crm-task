export const paths = {
  login: '/login',
  objects: '/',
  object: (objectId: string) => `/objects/${objectId}`,
  task: (taskId: string) => `/tasks/${taskId}`,
  myTasks: '/my-tasks',
} as const
