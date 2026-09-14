import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ContactsView } from './components/ContactsView'
import { Layout } from './components/Layout'
import { MailView } from './components/MailView'
import { StoreProvider } from './store/StoreContext'
import { ToastProvider } from './store/ToastContext'
import { UIProvider } from './store/UIContext'

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <ToastProvider>
          <UIProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/inbox" replace />} />
                <Route path="contacts" element={<ContactsView />} />
                <Route path="contacts/:contactId" element={<ContactsView />} />
                <Route path=":folder" element={<MailView />} />
                <Route path=":folder/:messageId" element={<MailView />} />
                <Route path="*" element={<Navigate to="/inbox" replace />} />
              </Route>
            </Routes>
          </UIProvider>
        </ToastProvider>
      </StoreProvider>
    </BrowserRouter>
  )
}
