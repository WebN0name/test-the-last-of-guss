import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LazyMotion, domMax } from 'motion/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { authApi } from '@/entities/user/api';
import { ApiError } from '@/shared/api/errors';
import { SessionProvider } from '@/app/providers/session-provider';
import { LoginForm } from './login-form';

const startSpy = vi.hoisted(() => vi.fn());

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  const wrapped = new WeakSet<object>();
  return {
    ...actual,
    useAnimationControls: () => {
      const controls = actual.useAnimationControls();
      if (!wrapped.has(controls)) {
        wrapped.add(controls);
        const original = controls.start.bind(controls);
        controls.start = (...args: Parameters<typeof original>) => {
          startSpy(...args);
          return original(...args);
        };
      }
      return controls;
    },
  };
});

vi.mock('@/entities/user/api', () => ({
  authApi: { me: vi.fn().mockRejectedValue(new Error('401')), login: vi.fn(), logout: vi.fn() },
}));

function wrap(ui: React.ReactElement) {
  return (
    <LazyMotion features={domMax} strict>
      <QueryClientProvider client={new QueryClient()}>
        <SessionProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>
    </LazyMotion>
  );
}

async function fill(login: string, password: string) {
  await userEvent.clear(screen.getByLabelText('Имя пользователя'));
  await userEvent.type(screen.getByLabelText('Имя пользователя'), login);
  await userEvent.clear(screen.getByLabelText('Пароль'));
  await userEvent.type(screen.getByLabelText('Пароль'), password);
}

describe('LoginForm', () => {
  it('ошибка INVALID_CREDENTIALS связана с полями и подставляет имя', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
    render(wrap(<LoginForm />));
    await fill('Иван', 'wrong-123');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('id', 'auth-error');
    expect(alert).toHaveTextContent('Имя «Иван» уже занято');
    for (const label of ['Имя пользователя', 'Пароль']) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input.getAttribute('aria-describedby')).toContain('auth-error');
      expect(input.getAttribute('aria-describedby')).toContain('form-item-description');
    }
  });

  it('shake срабатывает на каждую неудачную отправку', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
    render(wrap(<LoginForm />));
    await fill('Иван', 'wrong-123');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(startSpy).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(startSpy).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Имя пользователя')).toHaveValue('Иван');
  });

  it('ошибка сервера сбрасывается при вводе', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
    render(wrap(<LoginForm />));
    await fill('Иван', 'wrong-123');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await screen.findByRole('alert');
    await userEvent.type(screen.getByLabelText('Пароль'), '1');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('кнопка показа пароля переключает aria-pressed', async () => {
    render(wrap(<LoginForm />));
    const toggle = screen.getByRole('button', { name: 'Показать пароль' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Скрыть пароль' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('INVALID_CREDENTIALS → текст под кнопкой', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
    render(wrap(<LoginForm />));
    await userEvent.type(screen.getByLabelText('Имя пользователя'), 'Иван');
    await userEvent.type(screen.getByLabelText('Пароль'), 'wrong-123');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Неверный пароль/));
  });

  it('неизвестный код → общий текст', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new ApiError(418, 'WHATEVER', 'x'));
    render(wrap(<LoginForm />));
    await userEvent.type(screen.getByLabelText('Имя пользователя'), 'Иван');
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret-1');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Не удалось войти/));
  });

  it('HTTP_ERROR → сервер недоступен', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new ApiError(502, 'HTTP_ERROR', 'x'));
    render(wrap(<LoginForm />));
    await userEvent.type(screen.getByLabelText('Имя пользователя'), 'Иван');
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret-1');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Сервер временно недоступен/));
  });

  it('ошибка валидации показывается под полем, запрос не уходит', async () => {
    render(wrap(<LoginForm />));
    await userEvent.type(screen.getByLabelText('Имя пользователя'), 'ab');
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret-1');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByText(/от 3 до 32/)).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('успех → login вызван с введёнными данными', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      user: { id: '1', login: 'Иван', role: 'survivor' },
      created: true,
    });
    render(wrap(<LoginForm />));
    await userEvent.type(screen.getByLabelText('Имя пользователя'), 'Иван');
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret-1');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith({ login: 'Иван', password: 'secret-1' }));
  });
});
