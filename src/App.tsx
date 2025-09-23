import { Toaster } from 'sonner'
import './App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { queryClient } from './lib/react-query'

function App() {


  return (
    <>
      <Toaster richColors closeButton />
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </>
  )
}

export default App
