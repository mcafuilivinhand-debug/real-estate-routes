import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-editorial">404</h1>
        <p className="mt-3 text-muted-foreground">This page has moved on.</p>
        <div className="mt-6"><Link to="/" className="btn-outline">Return home</Link></div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-editorial">Something went off-course</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-5 flex gap-2 justify-center">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-primary">Try again</button>
          <a href="/" className="btn-outline">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ApexAnchor — Property, vehicles & ventures for sale or rent" },
      { name: "description", content: "Buy, sell or rent homes, cars, land, office space, companies and business ideas — all in one marketplace." },
      { property: "og:title", content: "ApexAnchor — Buy, sell or rent with confidence" },
      { property: "og:description", content: "Discover, compare and make offers in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setEmail(session?.user.email ?? null);
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient, router]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl tracking-tight">ApexAnchor</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">— marketplace</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link to="/browse" search={{ kind: "sale" }} className="btn-ghost">Browse to buy</Link>
              <Link to="/browse" search={{ kind: "rent" }} className="btn-ghost">Browse to rent</Link>
              {email ? (
                <>
                  <Link to="/deals" className="btn-ghost hidden sm:inline-flex">Enquiries</Link>
                  <Link to="/dashboard" className="btn-ghost hidden sm:inline-flex">Dashboard</Link>
                  <Link to="/sell" className="btn-primary">List an asset</Link>
                  <button onClick={handleSignOut} className="btn-ghost text-muted-foreground">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/auth" className="btn-ghost">Sign in</Link>
                  <Link to="/sell" className="btn-primary">List an asset</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1"><Outlet /></main>
        <footer className="border-t border-border/60 mt-24">
          <div className="max-w-6xl mx-auto px-5 py-10 text-sm text-muted-foreground flex flex-col sm:flex-row gap-4 justify-between">
            <p className="font-editorial text-lg text-foreground">ApexAnchor</p>
            <p>© {new Date().getFullYear()} ApexAnchor. Where buyers, sellers and renters meet.</p>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
