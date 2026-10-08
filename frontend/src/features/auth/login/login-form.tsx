import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Eye, EyeOff, Loader2 } from 'lucide-react';
import { m, useAnimationControls } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { errorText } from '@/shared/api/error-text';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { loginSchema, type LoginValues } from './login-schema';
import { useLogin } from './use-login';

const ERROR_ID = 'auth-error';
const FALLBACK_TEXT = 'Не удалось войти. Попробуй ещё раз.';

export function LoginForm() {
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { login: '', password: '' } });
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const controls = useAnimationControls();

  const serverError = login.error
    ? errorText(login.error, { context: 'login', login: login.variables?.login ?? '', fallback: FALLBACK_TEXT })
    : null;
  const invalidProps = serverError ? { 'aria-invalid': true, 'aria-describedby': ERROR_ID } : {};
  const invalidClass = serverError ? 'border-destructive' : '';

  const onSubmit = (values: LoginValues) => {
    login.mutate(values, {
      onError: () => {
        void controls.start({ x: [0, -6, 6, -4, 4, 0] }, { duration: 0.4 });
      },
    });
  };

  const resetServerError = () => {
    if (login.isError) login.reset();
  };

  return (
    <Form {...form}>
      <m.form
        onSubmit={form.handleSubmit(onSubmit)}
        animate={controls}
        className="flex flex-col gap-3.5 sm:gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="login"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя пользователя</FormLabel>
              <FormControl {...invalidProps}>
                <Input
                  autoComplete="username"
                  placeholder="Например, Иван"
                  className={cn('h-12 rounded-[14px] border-[3px] border-input sm:h-11', invalidClass)}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    resetServerError();
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <div className="relative">
                <FormControl {...invalidProps}>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Минимум 6 символов"
                    className={cn('h-12 rounded-[14px] border-[3px] border-input pr-12 sm:h-11', invalidClass)}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      resetServerError();
                    }}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={login.isPending}
          className="clay-press mt-1.5 h-12 w-full sm:mt-2 sm:h-11 rounded-full text-base font-bold shadow-clay"
        >
          {login.isPending ? <Loader2 className="size-5 animate-spin" /> : null}
          Войти
        </Button>
        {serverError ? (
          <m.div
            id={ERROR_ID}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-[14px] bg-destructive-soft p-3 text-sm font-semibold text-destructive"
          >
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
            <span>{serverError}</span>
          </m.div>
        ) : null}
      </m.form>
    </Form>
  );
}
