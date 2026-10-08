import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '@/entities/user/api';
import { useSession } from '@/entities/user/use-session';

export function useLogout() {
  const { clear } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clear();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
