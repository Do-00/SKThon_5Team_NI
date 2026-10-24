'use client'

import { Suspense, use } from 'react'
import { handlers } from '@/src/mocks/handlers'

const mockingEnabledPromise =
  typeof window !== 'undefined'
    ? import('@/src/mocks/browser').then(async ({ default: worker }) => {
      if (process.env.NODE_ENV === 'production') {
        return;
      }
      // Registration can fail in browsers/contexts that block service
      // workers (some automation sandboxes, strict privacy modes, etc.).
      // That should only mean "no request mocking", not a fatal error for
      // `use()` below — an uncaught rejection here crashes the whole tree.
      try {
        await worker.start({
          onUnhandledRequest(request, print) {
            if (request.url.includes('_next')) {
              return
            }
            print.warning()
          },
        })
        worker.use(...handlers);
        console.log(worker.listHandlers())
      } catch (error) {
        console.warn('[MSW] Service Worker registration failed, continuing without request mocking.', error)
      }
    })
    : Promise.resolve()

export function MSWProvider({
                              children,
                            }: Readonly<{
  children: React.ReactNode
}>) {
  // If MSW is enabled, we need to wait for the worker to start,
  // so we wrap the children in a Suspense boundary until it's ready.
  return (
    <Suspense fallback={null}>
      <MSWProviderWrapper>{children}</MSWProviderWrapper>
    </Suspense>
  )
}

function MSWProviderWrapper({
                              children,
                            }: Readonly<{
  children: React.ReactNode
}>) {
  use(mockingEnabledPromise)
  return children
}