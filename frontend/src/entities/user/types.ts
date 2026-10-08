import type { components } from '@/shared/api/schema';

export type User = components['schemas']['UserDto'];
export type UserRole = User['role'];
