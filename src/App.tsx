import { Text } from '@mantine/core'
import { Route, Routes } from 'react-router-dom'
import { StubLayout } from './layout/StubLayout.tsx'
import { Login } from './pages/Login.tsx'
import { MyTasks } from './pages/MyTasks.tsx'
import { ObjectDetail } from './pages/ObjectDetail.tsx'
import { ObjectsList } from './pages/ObjectsList.tsx'
import { TaskDetail } from './pages/TaskDetail.tsx'
import { paths } from './routes.ts'

function NotFound() {
  return <Text>Такого экрана нет.</Text>
}

export function App() {
  return (
    <Routes>
      <Route element={<StubLayout />}>
        <Route path={paths.login} element={<Login />} />
        <Route path={paths.objects} element={<ObjectsList />} />
        <Route path="/objects/:objectId" element={<ObjectDetail />} />
        <Route path="/tasks/:taskId" element={<TaskDetail />} />
        <Route path={paths.myTasks} element={<MyTasks />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
