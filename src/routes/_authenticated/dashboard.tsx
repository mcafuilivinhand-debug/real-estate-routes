import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsBroker } from "@/hooks/useBroker";
import {
  BROKER_NAME, DEAL_STATUS_LABEL, LISTING_STATUS_LABEL, categoryLabel, formatAmount, formatPrice,
  type DealStatus, type Kind,
} from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ApexAnchor" },
      { name: "description", content: "Your listings and every enquiry you have running." },
      { property: "og:title", content: "Dashboard — ApexAnchor" },
      { property: "og:description", content: "Your listings and every enquiry you have running." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: isBroker } = useIsBroker(user.id);

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

  const { data: deals } = useQuery({
    queryKey: ["my-deals", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, status, side, offer_amount, currency, created_at, listings(title)")
        .eq("client_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function remove(id: string) {
    if (!confirm("Withdraw this listing?")) return;
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
        <div className="flex gap-2">
          {isBroker && <Link to="/broker" className="btn-outline">Broker desk</Link>}
          <Link to="/sell" className="btn-primary">Submit a listing</Link>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-editorial text-2xl">Your listings on {BROKER_NAME}</h2>
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
                  <p className="text-xs text-muted-foreground mt-1">{LISTING_STATUS_LABEL[l.status] ?? l.status}</p>
                  <div className="mt-3 flex gap-2 text-sm">
                    <Link to="/listings/$id" params={{ id: l.id }} className="btn-outline !py-1 !px-3">View</Link>
                    <button onClick={() => remove(l.id)} className="btn-ghost !py-1 !px-3 text-destructive">Withdraw</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-editorial text-2xl">Your enquiries</h2>
        {!deals || deals.length === 0 ? (
          <p className="text-muted-foreground mt-3">No enquiries yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {deals.map((d) => {
              const listing = (d as unknown as { listings: { title: string } | null }).listings;
              return (
                <Link key={d.id} to="/deals/$id" params={{ id: d.id }} className="card-warm p-5 flex flex-wrap gap-3 justify-between items-center hover:border-primary transition">
                  <div>
                    <p className="font-editorial text-lg">{listing?.title ?? "Listing"}</p>
                    <p className="text-sm text-muted-foreground">
                      {d.side === "buy" ? "You're buying" : "You're selling"}
                      {d.offer_amount ? ` · Your offer ${formatAmount(Number(d.offer_amount), d.currency)}` : ""}
                      {" · "}{new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-primary">{DEAL_STATUS_LABEL[d.status as DealStatus]}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
