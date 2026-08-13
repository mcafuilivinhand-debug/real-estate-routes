import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, RENTABLE, SELLABLE, type Kind, type CategoryId } from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({
    meta: [
      { title: "Create a listing — ApexAnchor" },
      { name: "description", content: "List your home, car, land, office, company or business idea on ApexAnchor." },
    ],
  }),
  component: SellPage,
});

const schema = z.object({
  kind: z.enum(["sale", "rent"]),
  category: z.enum(["car", "house", "land", "company", "business_idea", "office"]),
  title: z.string().trim().min(4, "Title is too short").max(120),
  description: z.string().trim().max(4000).optional(),
  price: z.coerce.number().nonnegative("Price must be positive"),
  currency: z.string().trim().min(3).max(4),
  location: z.string().trim().max(160).optional(),
  image_url: z.string().trim().url("Enter a valid URL").max(2000).optional().or(z.literal("")),
});

function SellPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [kind, setKind] = useState<Kind>("sale");
  const [category, setCategory] = useState<CategoryId>("house");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const available = kind === "rent" ? RENTABLE : SELLABLE;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      kind, category,
      title: fd.get("title"),
      description: fd.get("description"),
      price: fd.get("price"),
      currency: (fd.get("currency") as string) || "USD",
      location: fd.get("location"),
      image_url: fd.get("image_url"),
    });
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    setSaving(true);
    const { data, error } = await supabase.from("listings").insert({
      owner_id: user.id,
      kind: parsed.data.kind,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      price: parsed.data.price,
      currency: parsed.data.currency.toUpperCase(),
      location: parsed.data.location ?? "",
      image_url: parsed.data.image_url || null,
      status: "pending",
    }).select("id").single();
    setSaving(false);
    if (error) return setErr(error.message);
    void data;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">New listing</p>
      <h1 className="font-editorial text-4xl mt-2">Tell us what you're offering</h1>
      <p className="text-muted-foreground mt-2">A few details is all it takes.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Type</label>
          <div className="mt-2 inline-flex rounded-md border border-border overflow-hidden text-sm">
            <button type="button" className={`px-4 py-2 ${kind === "sale" ? "bg-foreground text-background" : ""}`}
              onClick={() => { setKind("sale"); if (!SELLABLE.includes(category)) setCategory("house"); }}>For sale</button>
            <button type="button" className={`px-4 py-2 ${kind === "rent" ? "bg-foreground text-background" : ""}`}
              onClick={() => { setKind("rent"); if (!RENTABLE.includes(category)) setCategory("house"); }}>For rent</button>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Category</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => available.includes(c.id)).map((c) => (
              <button type="button" key={c.id}
                className={`px-3 py-1.5 rounded-full text-sm border ${category === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground"}`}
                onClick={() => setCategory(c.id)}>{c.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Title</label>
          <input name="title" required maxLength={120} className="input-field mt-1" placeholder="Sun-drenched 3-bed near the park" />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Description</label>
          <textarea name="description" maxLength={4000} className="input-field mt-1 min-h-[140px]" placeholder="What makes it special?" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Price {kind === "rent" && "(per month)"}
            </label>
            <input name="price" type="number" min="0" step="1" required className="input-field mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Currency</label>
            <input name="currency" defaultValue="USD" maxLength={4} required className="input-field mt-1" />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Location</label>
          <input name="location" maxLength={160} className="input-field mt-1" placeholder="City, region" />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Image URL</label>
          <input name="image_url" type="url" maxLength={2000} className="input-field mt-1" placeholder="https://…" />
          <p className="text-xs text-muted-foreground mt-1">Paste a link to a photo. File uploads coming soon.</p>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}
        <button disabled={saving} className="btn-primary w-full disabled:opacity-60" type="submit">
          {saving ? "Publishing…" : "Publish listing"}
        </button>
      </form>
    </div>
  );
}
