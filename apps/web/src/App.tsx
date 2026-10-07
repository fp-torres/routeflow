import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster, TooltipProvider } from '@routeflow/ui';
import { ApiError } from '@/lib/api';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { ViewAsProvider } from '@/lib/view-as';
import { PageSkeleton } from './components/states';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (count, error) =>
        !(error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) && count < 1,
    },
  },
});

function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster theme={resolved} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ViewAsProvider>
            <TooltipProvider delayDuration={300}>
              <Suspense
                fallback={
                  <div className="p-6">
                    <PageSkeleton />
                  </div>
                }
              >
                <RouterProvider router={router} />
              </Suspense>
              <ThemedToaster />
            </TooltipProvider>
          </ViewAsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
