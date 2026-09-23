import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { ToastProvider, toastManager } from '@/components/ui/Toasts';
import { db, ensureMeta } from '@/db';
import { useDisplaySync } from '@/features/appearance';
import { UpdatePrompt } from '@/features/pwa';
import { queryClient } from './queryClient';
import { router } from './router';

export function App() {
  useDisplaySync();
  useEffect(() => {
    void ensureMeta(db);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider toastManager={toastManager}>
        <TooltipProvider delay={400}>
          <RouterProvider router={router} />
          <UpdatePrompt />
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
