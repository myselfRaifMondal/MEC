import { Outlet } from 'react-router-dom'
import { AskAIPanel } from './AskAIPanel'
import { useUI } from '../store/UIContext'
import { Compose } from './Compose'
import { LoggedOut } from './LoggedOut'
import { Modals } from './Modals'
import { Sidebar } from './Sidebar'
import { Toasts } from './Toasts'
import { TopBar } from './TopBar'

export function Layout() {
  const { loggedIn } = useUI()
  if (!loggedIn) return <LoggedOut />
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TopBar />
        <Outlet />
      </div>
      <Compose />
      <AskAIPanel />
      <Modals />
      <Toasts />
    </div>
  )
}
