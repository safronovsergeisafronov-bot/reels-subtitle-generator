import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CabinetLayout from './components/CabinetLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Projects from './pages/Projects.jsx'
import Settings from './pages/Settings.jsx'
import { ToastProvider } from './components/Toast'
import { ModalProvider } from './components/ConfirmModal'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ModalProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/cabinet" element={<CabinetLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </ModalProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
