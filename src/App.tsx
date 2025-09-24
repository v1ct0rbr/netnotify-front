import { Toaster } from 'sonner'
import './App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { queryClient } from './lib/react-query'
import { ThemeProvider } from './components/theme-provider'

function App() {


  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Toaster richColors closeButton />
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
