import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { applySystemTheme } from '@/shared/lib/theme';
import { AppProviders } from './providers/app-providers';
import { router } from './routes/router';
import './styles/globals.css';

applySystemTheme();

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
