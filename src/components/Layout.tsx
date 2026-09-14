import { Outlet } from 'react-router-dom'
import { AskAIPanel } from './AskAIPanel'
import { Compose } from './Compose'
import { Modals } from './Modals'
import { Sidebar } from './Sidebar'
import { Toasts } from './Toasts'
import { TopBar } from './TopBar'

export function Layout() {
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
