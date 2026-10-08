import { LoginForm } from '@/features/auth/login/login-form';
import gooseReady from '@/shared/assets/guss_ready.png';

export function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-6 sm:py-12">
      <section className="clay-card flex w-full max-w-100 flex-col gap-5 px-5 py-6 sm:gap-6 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={gooseReady} alt="" width={96} height={96} className="size-20 sm:size-24" />
          <h1 className="text-[28px] sm:text-[32px]">The Last of Guss</h1>
          <p className="text-[15px] text-muted-foreground">
            Введи имя и пароль. Нового имени ещё нет — создадим аккаунт
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
