'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { theme } from '@/lib/theme'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="top-right" />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  )
}
