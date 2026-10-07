import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { loginSchema } from '@routeflow/types';
import { Alert, Button, Checkbox, Field, Input } from '@routeflow/ui';
import { Wordmark } from '@/components/brand';
import { errorMessage } from '@/components/states';
import { useAuth } from '@/lib/auth';

const REMEMBER_KEY = 'rf-remember';

/** Só a preferência da caixa (não guarda senha nem token). */
function rememberPreference(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
}

function saveRememberPreference(value: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, value ? '1' : '0');
  } catch {
    // armazenamento indisponível
  }
}

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: rememberPreference() },
  });
  const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/dashboard';

  React.useEffect(() => {
    document.title = 'Entrar — RouteFlow';
  }, []);
  if (status === 'authenticated') return <Navigate to={next} replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await login(values.email, values.password, values.remember);
      saveRememberPreference(values.remember);
      navigate(next, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section
        className="relative hidden overflow-hidden bg-[#13233b] p-12 text-white lg:flex lg:flex-col lg:justify-between"
        aria-hidden
      >
        <Wordmark className="text-white" />
        <svg viewBox="0 0 400 300" className="w-full max-w-lg">
          <path
            d="M30 230 C110 40, 200 300, 370 70"
            fill="none"
            stroke="#F05A28"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {[
            [30, 230],
            [118, 128],
            [190, 182],
            [262, 170],
            [370, 70],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === 0 || i === 4 ? 16 : 11}
              fill={i === 0 ? '#ffffff' : i === 4 ? '#F05A28' : '#13233b'}
              stroke="#ffffff"
              strokeWidth="5"
            />
          ))}
        </svg>
        <div>
          <p className="max-w-md text-3xl leading-tight font-bold">
            Tudo registrado no caminho.
          </p>
          <p className="mt-3 max-w-md text-[#c9d4e5]">
            Agenda, rotas, evidências, autorizações e despesas da operação em campo, num só lugar.
          </p>
        </div>
      </section>
      <section className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Wordmark className="mb-8 lg:hidden" />
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="mt-1 mb-6 text-muted-foreground">
            Gestão inteligente de operações em campo.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            {error ? <Alert tone="danger" title={error} /> : null}
            <Field label="E-mail" htmlFor="email" error={form.formState.errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                aria-invalid={!!form.formState.errors.email}
                {...form.register('email')}
              />
            </Field>
            <Field label="Senha" htmlFor="password" error={form.formState.errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!form.formState.errors.password}
                {...form.register('password')}
              />
            </Field>
            <Checkbox
              id="remember"
              label={
                <span className="flex flex-col">
                  <span className="font-semibold">Lembrar acesso</span>
                  <span className="text-xs text-muted-foreground">
                    Continua conectado neste aparelho (até 30 dias sem uso). Não marque em
                    computadores compartilhados.
                  </span>
                </span>
              }
              {...form.register('remember')}
            />
            <Button type="submit" size="lg" loading={form.formState.isSubmitting} block>
              <LogIn /> Entrar
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
