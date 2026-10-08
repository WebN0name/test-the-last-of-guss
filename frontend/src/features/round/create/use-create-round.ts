import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { roundsApi } from '@/entities/round/api';
import { errorText } from '@/shared/api/error-text';

const CREATE_ROUND_KEY = ['rounds', 'create'] as const;

export function useCreateRound() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const busy = useIsMutating({ mutationKey: CREATE_ROUND_KEY }) > 0;
  const mutation = useMutation({
    mutationKey: CREATE_ROUND_KEY,
    mutationFn: () => roundsApi.create(),
    onSuccess: (round) => {
      void queryClient.invalidateQueries({ queryKey: ['rounds', 'current'] });
      toast.success('Раунд создан');
      navigate(`/rounds/${round.id}`);
    },
    onError: (error) => toast.error(errorText(error, { context: 'round', fallback: 'Не удалось создать раунд' })),
  });
  return { create: () => (busy ? undefined : mutation.mutate()), busy };
}
