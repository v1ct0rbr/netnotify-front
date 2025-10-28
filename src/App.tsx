import { Toaster } from 'sonner'
import './App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { queryClient } from './lib/react-query'
import { ThemeProvider } from './components/theme-provider'
import { KeycloakProvider } from './providers/keycloakProvider'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <KeycloakProvider>
        <Toaster richColors closeButton />
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
      </KeycloakProvider>
    </ThemeProvider>
  )
}

export default App
