'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000 },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#091928', color: '#fff', fontSize: '14px' },
          success: { iconTheme: { primary: '#71AA1F', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EA9D13', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
