import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

export const Route = createFileRoute('/auth')({ component: AuthPage });

const schema = z.object({
  email: z.string().trim().email('Enter a valid email').max(255),
  password: z.string().min(8, 'At least 8 characters').max(72),
});

const otpSchema = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.');

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: '/dashboard', replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Enter a display name.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { display_name: name.trim() },
          },
        });

        if (result.error) throw result.error;

        if (!result.data.session) {
          setEmail(parsed.data.email);
          setOtp('');
          setVerificationPending(true);
          setResendSeconds(60);
          return;
        }
      } else {
        const result = await supabase.auth.signInWithPassword(parsed.data);
        if (result.error) throw result.error;
      }

      router.invalidate();
      navigate({ to: '/dashboard', replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: parsed.data,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      router.invalidate();
      navigate({ to: '/dashboard', replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code could not be verified.');
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (resendSeconds > 0 || !email) return;

    setError(null);
    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) throw resendError;

      setOtp('');
      setResendSeconds(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to resend the code.');
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}dashboard`,
      },
    });
    if (error) setError('Google sign-in is not enabled for this Supabase project yet.');
  }

  if (verificationPending) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-md">
          <p className="eyebrow text-center">ApexAnchor</p>
          <h1 className="font-editorial text-4xl text-center mt-2">Verify your email</h1>
          <p className="text-center text-muted-foreground mt-2">
            We sent a 6-digit verification code to {email}.
          </p>

          <div className="card-warm p-6 mt-8">
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <label className="field-label">Verification code</label>
                <input
                  className="input-field mt-1 text-center tracking-[0.45em] text-xl"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  aria-label="6-digit verification code"
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button disabled={loading || otp.length !== 6} className="btn-primary w-full">
                {loading ? 'Verifying…' : 'Verify email'}
              </button>
            </form>

            <div className="text-center mt-5 text-sm text-muted-foreground">
              {resendSeconds > 0 ? (
                <p>Resend code in 0:{String(resendSeconds).padStart(2, '0')}</p>
              ) : (
                <button
                  type="button"
                  className="underline text-foreground"
                  onClick={resendCode}
                  disabled={loading}
                >
                  Resend code
                </button>
              )}
            </div>

            <button
              type="button"
              className="block mx-auto mt-4 text-sm underline text-muted-foreground"
              onClick={() => {
                setVerificationPending(false);
                setError(null);
              }}
            >
              Back to sign up
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <p className="eyebrow text-center">ApexAnchor</p>
        <h1 className="font-editorial text-4xl text-center mt-2">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          {mode === 'signin' ? 'Sign in to list and message.' : 'A few details to get you started.'}
        </p>

        <div className="card-warm p-6 mt-8">
          <button onClick={google} className="btn-outline w-full">
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="rule flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="rule flex-1" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="field-label">Display name</label>
                <input
                  className="input-field mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>
            )}

            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                required
                className="input-field mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                required
                className="input-field mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-center mt-5 text-muted-foreground">
            {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
            <button
              className="underline text-foreground"
              onClick={() => {
                setError(null);
                setMode(mode === 'signin' ? 'signup' : 'signin');
              }}
            >
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
