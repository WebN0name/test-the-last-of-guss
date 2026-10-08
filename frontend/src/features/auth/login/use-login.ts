import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { authApi } from '@/entities/user/api';
import { useSession } from '@/entities/user/use-session';
import type { LoginValues } from './login-schema';

export function useLogin() {
  const { setUser } = useSession();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (values: LoginValues) => authApi.login(values),
    onSuccess: (res) => {
      setUser(res.user);
      if (res.created) toast.success('Аккаунт создан');
      navigate('/rounds', { replace: true });
    },
  });
}
