import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, categoryLabel, formatPrice, RENTABLE, type CategoryId, type Kind } from "@/lib/marketplace";
import hero from "@/assets/hero.jpg";

const CATEGORY_ICON: Record<CategoryId, string> = {
  house: "🏠",
  car: "🚗",
  land: "🌍",
  office: "🏢",
  company: "💼",
  business_idea: "💡",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ApexAnchor — Property, vehicles and ventures for sale or rent" },
      { name: "description", content: "Buy, sell and rent cars, homes, land, office space, companies and business ideas — all in one marketplace." },
      { property: "og:title", content: "ApexAnchor — Buy, sell or rent with confidence" },
      { property: "og:description", content: "Homes, cars, land, offices and companies — all in one marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind | "any">("any");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [location, setLocation] = useState("");

  function runSearch() {
    navigate({
      to: "/browse",
      search: {
        kind: kind === "any" ? "sale" : kind,
        category: category || undefined,
        location: location.trim() || undefined,
      },
    });
  }

  const { data: featured } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price, currency, location, image_url, category, kind")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-accent/30 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-14 grid md:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div>
            <h1 className="font-editorial text-5xl md:text-6xl leading-[1.05]">
              Find your<br />next <em className="text-primary not-italic">move.</em>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-md">
              Discover cars, homes, land, office space, companies and business
              opportunities — all in one marketplace.
            </p>

            {/* Search bar */}
            <div className="mt-8 card-warm p-3 grid sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <select
                aria-label="Buy or rent"
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind | "any")}
                className="bg-background border border-border rounded-md px-3 py-2.5 text-sm"
              >
                <option value="any">Buy or rent</option>
                <option value="sale">Buy</option>
                <option value="rent">Rent</option>
              </select>
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryId | "")}
                className="bg-background border border-border rounded-md px-3 py-2.5 text-sm"
              >
                <option value="">Any category</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <input
                aria-label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Choose location"
                className="bg-background border border-border rounded-md px-3 py-2.5 text-sm"
              />
              <button onClick={runSearch} className="btn-primary !rounded-md">Search</button>
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden shadow-lg min-h-[320px] flex flex-col justify-end">
            <img
              src={hero}
              alt="Sunlit villa entrance with a vintage car at golden hour"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="relative bg-gradient-to-t from-foreground/85 to-transparent p-7 text-background">
              <p className="text-xs uppercase tracking-[0.2em] opacity-80">One platform. More possibilities.</p>
              <h2 className="font-editorial text-3xl mt-3">Buy. Sell. Rent.</h2>
              <p className="text-sm opacity-80 mt-2">
                Opportunities that move your life and business forward.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-5 mt-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Categories</p>
            <h2 className="font-editorial text-4xl mt-2">Explore what's on offer</h2>
          </div>
          <Link to="/browse" search={{ kind: "sale" }} className="hidden sm:inline text-sm underline underline-offset-4">View everything →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to="/browse"
              search={{ kind: RENTABLE.includes(c.id) ? "sale" : "sale", category: c.id }}
              className="card-warm p-6 text-center hover:border-primary transition"
            >
              <span className="text-3xl" aria-hidden>{CATEGORY_ICON[c.id]}</span>
              <p className="font-editorial text-xl mt-3">{c.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-6xl mx-auto px-5 mt-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Featured</p>
            <h2 className="font-editorial text-4xl mt-2">Latest opportunities</h2>
          </div>
          <Link to="/browse" search={{ kind: "sale" }} className="hidden sm:inline text-sm underline underline-offset-4">See all →</Link>
        </div>
        {featured && featured.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((l) => (
              <Link key={l.id} to="/listings/$id" params={{ id: l.id }} className="card-warm overflow-hidden group">
                <div className="aspect-[4/3] bg-muted">
                  {l.image_url
                    ? <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl" aria-hidden>{CATEGORY_ICON[l.category as CategoryId] ?? "🏷️"}</div>}
                </div>
                <div className="p-5">
                  <span className="inline-block text-[10px] uppercase tracking-widest text-primary bg-primary/10 rounded-full px-2.5 py-1 font-semibold">
                    {l.kind === "rent" ? "For rent" : "For sale"} · {categoryLabel(l.category)}
                  </span>
                  <h3 className="font-editorial text-xl mt-3 line-clamp-1">{l.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{l.location || "Ghana"}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card-warm p-10 text-center">
            <p className="font-editorial text-2xl">Fresh listings are on the way</p>
            <p className="text-muted-foreground mt-2">Be the first to list something and reach the whole market.</p>
            <Link to="/sell" className="btn-primary mt-5 inline-block">List an asset</Link>
          </div>
        )}
      </section>

      {/* Rent banner */}
      <section className="max-w-6xl mx-auto px-5 mt-20">
        <Link to="/browse" search={{ kind: "rent" }} className="card-warm bg-foreground text-background p-10 md:p-12 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:opacity-95 transition">
          <div>
            <h2 className="font-editorial text-3xl">Looking to rent?</h2>
            <p className="opacity-75 mt-2">Find cars, homes and office spaces that fit your needs.</p>
          </div>
          <span className="bg-background text-foreground px-5 py-3 rounded-md text-sm font-semibold shrink-0">Browse to rent →</span>
        </Link>
      </section>

      {/* List CTA */}
      <section className="max-w-6xl mx-auto px-5 mt-20">
        <div className="border-t border-border pt-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-editorial text-4xl">Ready to list something?</h2>
            <p className="text-muted-foreground mt-3 max-w-md">
              Add your property, vehicle, business or rental opportunity and
              reach more people. Every listing is reviewed before it goes live.
            </p>
          </div>
          <div className="flex md:justify-end gap-3">
            <Link to="/sell" className="btn-primary">List an asset</Link>
            <Link to="/auth" className="btn-outline">Sign in</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
