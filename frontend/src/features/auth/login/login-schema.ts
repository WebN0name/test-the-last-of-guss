import { z } from 'zod';

const LOGIN_MESSAGE = 'Имя — от 3 до 32 символов';
const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;

export const loginSchema = z.object({
  login: z
    .string()
    .min(3, LOGIN_MESSAGE)
    .max(32, LOGIN_MESSAGE)
    .refine((v) => v === v.trim(), 'Без пробелов в начале и конце')
    .refine((v) => !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(v), 'Без управляющих и невидимых символов'),
  password: z
    .string()
    .min(6, 'Пароль — минимум 6 символов')
    .refine((v) => utf8Bytes(v) <= 72, 'Пароль слишком длинный'),
});

export type LoginValues = z.infer<typeof loginSchema>;
