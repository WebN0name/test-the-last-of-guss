import { api, unwrap, unwrapEmpty } from '@/shared/api/client';
import type { components } from '@/shared/api/schema';

type LoginBody = components['schemas']['LoginDto'];
type AuthResponse = components['schemas']['AuthResponseDto'];
type MeResponse = components['schemas']['MeResponseDto'];

export const authApi = {
  async login(body: LoginBody): Promise<AuthResponse> {
    return unwrap(await api.POST('/api/auth/login', { body }));
  },
  async me(): Promise<MeResponse> {
    return unwrap(await api.GET('/api/auth/me'));
  },
  async logout(): Promise<void> {
    unwrapEmpty(await api.POST('/api/auth/logout'));
  },
};
