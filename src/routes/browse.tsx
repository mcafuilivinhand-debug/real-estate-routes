import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, categoryLabel, formatPrice, RENTABLE, SELLABLE, type Kind, type CategoryId } from "@/lib/marketplace";

const searchSchema = z.object({
  kind: z.enum(["sale", "rent"]).default("sale"),
  category: z.enum(["car", "house", "land", "company", "business_idea", "office"]).optional(),
  q: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
});

export const Route = createFileRoute("/browse")({
  validateSearch: (s) => searchSchema.parse(s),
  head: ({ match }) => {
    const kind = (match.search as { kind: Kind }).kind;
    return {
      meta: [
        { title: `${kind === "rent" ? "For rent" : "For sale"} — ApexAnchor` },
        { name: "description", content: `Browse ${kind === "rent" ? "rentals" : "listings"} across homes, cars, land, offices and companies.` },
      ],
    };
  },
  component: BrowsePage,
});

function BrowsePage() {
  const { kind, category, q, min, max } = Route.useSearch();
  const navigate = Route.useNavigate();
  const validCategories = kind === "rent" ? RENTABLE : SELLABLE;

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", kind, category, q, min, max],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("id, title, price, currency, location, image_url, category, kind, created_at")
        .eq("status", "active")
        .eq("kind", kind)
        .order("created_at", { ascending: false })
        .limit(60);
      if (category) query = query.eq("category", category);
      if (q) query = query.ilike("title", `%${q}%`);
      if (min != null) query = query.gte("price", min);
      if (max != null) query = query.lte("price", max);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  function update(patch: Partial<{ kind: Kind; category?: CategoryId; q?: string; min?: number; max?: number }>) {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }) as never, replace: true });
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Marketplace</p>
          <h1 className="font-editorial text-5xl mt-2">
            {kind === "rent" ? "For rent" : "For sale"}
            {category && <span className="text-muted-foreground"> · {categoryLabel(category)}</span>}
          </h1>
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden text-sm">
          <button className={`px-4 py-2 ${kind === "sale" ? "bg-foreground text-background" : ""}`} onClick={() => update({ kind: "sale", category: undefined })}>Buy</button>
          <button className={`px-4 py-2 ${kind === "rent" ? "bg-foreground text-background" : ""}`} onClick={() => update({ kind: "rent", category: undefined })}>Rent</button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          onClick={() => update({ category: undefined })}
          className={`px-3 py-1.5 rounded-full text-sm border ${!category ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground"}`}
        >All</button>
        {CATEGORIES.filter((c) => validCategories.includes(c.id)).map((c) => (
          <button key={c.id}
            onClick={() => update({ category: c.id })}
            className={`px-3 py-1.5 rounded-full text-sm border ${category === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground"}`}
          >{c.label}</button>
        ))}
      </div>

      <div className="mt-4 grid sm:grid-cols-4 gap-3">
        <input className="input-field sm:col-span-2" placeholder="Search title…" defaultValue={q ?? ""}
          onChange={(e) => update({ q: e.target.value || undefined })} />
        <input className="input-field" type="number" placeholder="Min price" defaultValue={min ?? ""}
          onChange={(e) => update({ min: e.target.value ? Number(e.target.value) : undefined })} />
        <input className="input-field" type="number" placeholder="Max price" defaultValue={max ?? ""}
          onChange={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })} />
      </div>

      {/* Results */}
      <div className="mt-10">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !listings || listings.length === 0 ? (
          <div className="border-t border-border pt-16 text-center">
            <p className="font-editorial text-2xl">Nothing here yet.</p>
            <p className="text-muted-foreground mt-2">Be the first to list something in this category.</p>
            <Link to="/sell" className="btn-primary mt-6 inline-flex">Create a listing</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((l) => (
              <Link key={l.id} to="/listings/$id" params={{ id: l.id }} className="group card-warm overflow-hidden hover:border-primary transition">
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  {l.image_url ? (
                    <img src={l.image_url} alt={l.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">No image</div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-widest text-primary">{categoryLabel(l.category)}</p>
                  <h3 className="font-editorial text-xl mt-1 line-clamp-1">{l.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{l.location || "—"}</p>
                  <p className="mt-3 font-medium">{formatPrice(Number(l.price), l.currency, l.kind as Kind)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
