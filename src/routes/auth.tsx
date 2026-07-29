import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ApexAnchor" },
      { name: "description", content: "Sign in or create an account to list, save and message on ApexAnchor." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name.trim() || undefined },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      }
      router.invalidate();
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError(result.error.message);
    if (result.redirected) return;
    router.invalidate();
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs uppercase tracking-[0.2em] text-primary text-center">ApexAnchor</p>
        <h1 className="font-editorial text-4xl text-center mt-2">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-center text-muted-foreground mt-2 text-sm">
          {mode === "signin" ? "Sign in to list, save and message." : "A few details to get you started."}
        </p>

        <div className="card-warm p-6 mt-8">
          <button onClick={handleGoogle} type="button" className="btn-outline w-full">
            Continue with Google
          </button>
          <div className="flex items-center gap-3 my-5">
            <div className="rule flex-1" /><span className="text-xs text-muted-foreground">or</span><div className="rule flex-1" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Display name</label>
                <input className="input-field mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ada Lovelace" />
              </div>
            )}
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
              <input type="email" required className="input-field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
              <input type="password" required className="input-field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="text-sm text-center mt-5 text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button className="underline underline-offset-4 text-foreground" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
