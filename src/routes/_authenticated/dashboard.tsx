import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, formatPrice, type Kind } from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ApexAnchor" },
      { name: "description", content: "Manage your listings and messages on ApexAnchor." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  const { data: mine } = useQuery({
    queryKey: ["my-listings", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price, currency, kind, category, status, image_url, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: inquiries } = useQuery({
    queryKey: ["my-inquiries", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("id, message, contact_email, contact_phone, created_at, listing_id, sender_id, listings!inner(title, owner_id)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function remove(id: string) {
    if (!confirm("Delete this listing?")) return;
    await supabase.from("listings").delete().eq("id", id);
    window.location.reload();
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Your dashboard</p>
          <h1 className="font-editorial text-4xl mt-2">Welcome back</h1>
        </div>
        <Link to="/sell" className="btn-primary">New listing</Link>
      </div>

      <section className="mt-10">
        <h2 className="font-editorial text-2xl">Your listings</h2>
        {!mine || mine.length === 0 ? (
          <p className="text-muted-foreground mt-3">You haven't listed anything yet.</p>
        ) : (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mine.map((l) => (
              <div key={l.id} className="card-warm overflow-hidden">
                <div className="aspect-[4/3] bg-muted">
                  {l.image_url ? <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-widest text-primary">{categoryLabel(l.category)} · {l.kind === "rent" ? "Rent" : "Sale"}</p>
                  <p className="font-editorial text-lg mt-1 line-clamp-1">{l.title}</p>
                  <p className="text-sm mt-1">{formatPrice(Number(l.price), l.currency, l.kind as Kind)}</p>
                  <div className="mt-3 flex gap-2 text-sm">
                    <Link to="/listings/$id" params={{ id: l.id }} className="btn-outline !py-1 !px-3">View</Link>
                    <button onClick={() => remove(l.id)} className="btn-ghost !py-1 !px-3 text-destructive">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-editorial text-2xl">Recent messages</h2>
        {!inquiries || inquiries.length === 0 ? (
          <p className="text-muted-foreground mt-3">No messages yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {inquiries.map((i) => {
              const listing = (i as unknown as { listings: { title: string; owner_id: string } }).listings;
              const iAmOwner = listing.owner_id === user.id;
              return (
                <div key={i.id} className="card-warm p-5">
                  <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
                    <span>{iAmOwner ? "Received" : "Sent"} · {listing.title}</span>
                    <span>{new Date(i.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-foreground/90 whitespace-pre-wrap">{i.message}</p>
                  {(i.contact_email || i.contact_phone) && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {i.contact_email && <>Email: <span className="text-foreground">{i.contact_email}</span> </>}
                      {i.contact_phone && <> · Phone: <span className="text-foreground">{i.contact_phone}</span></>}
                    </p>
                  )}
                  <Link to="/listings/$id" params={{ id: i.listing_id }} className="text-sm underline underline-offset-4 mt-2 inline-block">View listing →</Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
