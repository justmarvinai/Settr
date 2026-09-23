import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { ToastProvider, toastManager } from '@/components/ui/Toasts';
import { db, ensureMeta } from '@/db';
import { useDisplaySync } from '@/features/appearance';
import { UpdatePrompt } from '@/features/pwa';
import { router } from './router';

export function App() {
  useDisplaySync();
  useEffect(() => {
    void ensureMeta(db);
  }, []);

  return (
    <ToastProvider toastManager={toastManager}>
      <TooltipProvider delay={400}>
        <RouterProvider router={router} />
        <UpdatePrompt />
      </TooltipProvider>
    </ToastProvider>
  );
}
