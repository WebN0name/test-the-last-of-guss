import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from '@/pages/login/login-page';
import { RoundPage } from '@/pages/round/round-page';
import { RoundsPage } from '@/pages/rounds/rounds-page';
import { RequireAuth } from './require-auth';
import { RequireGuest } from './require-guest';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/rounds" replace /> },
  {
    path: '/login',
    element: (
      <RequireGuest>
        <LoginPage />
      </RequireGuest>
    ),
  },
  {
    path: '/rounds',
    element: (
      <RequireAuth>
        <RoundsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/rounds/:id',
    element: (
      <RequireAuth>
        <RoundPage />
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/rounds" replace /> },
]);
