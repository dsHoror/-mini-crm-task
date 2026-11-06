import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth.tsx'
import { AppLayout } from './layout/AppLayout.tsx'
import { Login } from './pages/Login.tsx'
import { MyTasks } from './pages/MyTasks.tsx'
import { NotFound } from './pages/NotFound.tsx'
import { ObjectDetail } from './pages/ObjectDetail.tsx'
import { ObjectsList } from './pages/ObjectsList.tsx'
import { TaskDetail } from './pages/TaskDetail.tsx'
import { paths } from './routes.ts'

export function App() {
  return (
    <Routes>
      <Route path={paths.login} element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path={paths.objects} element={<ObjectsList />} />
          <Route path="/objects/:objectId" element={<ObjectDetail />} />
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
          <Route path={paths.myTasks} element={<MyTasks />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
