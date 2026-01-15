import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const container = document.getElementById('root');
const root = createRoot(container!);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 3,
      networkMode: 'offlineFirst', // Serve from cache if offline
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});


root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
        <Toaster />
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
