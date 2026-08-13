import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsBroker } from "@/hooks/useBroker";
import {
  DEAL_STATUS_LABEL, LISTING_STATUS_LABEL, categoryLabel, formatAmount, formatPrice,
  type DealStatus, type Kind,
} from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/broker")({
  head: () => ({
    meta: [
      { title: "Broker desk — ApexAnchor" },
      { name: "description", content: "Review listings, run negotiations and close deals from the ApexAnchor broker desk." },
      { property: "og:title", content: "Broker desk — ApexAnchor" },
      { property: "og:description", content: "Review listings, run negotiations and close deals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerDesk,
});

function BrokerDesk() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: isBroker, isLoading } = useIsBroker(user.id);

  const { data: brokerExists } = useQuery({
    queryKey: ["broker-exists"],
    queryFn: async () => {
      const { data } = await supabase.rpc("broker_exists");
      return !!data;
    },
  });

  const { data: listings } = useQuery({
    queryKey: ["broker-listings"],
    enabled: !!isBroker,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price, currency, kind, category, status, image_url, location, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["broker-deals"],
    enabled: !!isBroker,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, status, side, offer_amount, currency, created_at, contact_email, contact_phone, listings(title)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function claim() {
    await supabase.rpc("claim_broker_role");
    qc.invalidateQueries();
  }

  async function setListingStatus(id: string, status: "active" | "pending" | "archived" | "sold") {
    await supabase.from("listings").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["broker-listings"] });
  }

  if (isLoading) return <div className="max-w-5xl mx-auto px-5 py-16 text-muted-foreground">Loading…</div>;

  if (!isBroker) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Broker desk</p>
        <h1 className="font-editorial text-4xl mt-2">This desk is private</h1>
        {brokerExists === false ? (
          <>
            <p className="text-muted-foreground mt-3">
              No broker has been assigned yet. Claim the desk with this account — it can only be done once.
            </p>
            <button onClick={claim} className="btn-primary mt-6">Claim the broker desk</button>
          </>
        ) : (
          <p className="text-muted-foreground mt-3">Only the ApexAnchor broker can open this page.</p>
        )}
      </div>
    );
  }

  const pending = (listings ?? []).filter((l) => l.status === "pending");
  const live = (listings ?? []).filter((l) => l.status !== "pending");

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">Broker desk</p>
      <h1 className="font-editorial text-4xl mt-2">Everything passes through you</h1>

      <section className="mt-10">
        <h2 className="font-editorial text-2xl">Submitted for review ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground mt-3">Nothing waiting.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {pending.map((l) => (
              <div key={l.id} className="card-warm p-5 flex flex-wrap gap-4 items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-primary">{categoryLabel(l.category)} · {l.kind === "rent" ? "Rent" : "Sale"}</p>
                  <p className="font-editorial text-lg">{l.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(Number(l.price), l.currency, l.kind as Kind)} · {l.location || "No location"}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <Link to="/listings/$id" params={{ id: l.id }} className="btn-outline !py-1 !px-3">View</Link>
                  <button onClick={() => setListingStatus(l.id, "active")} className="btn-primary !py-1 !px-3">Publish</button>
                  <button onClick={() => setListingStatus(l.id, "archived")} className="btn-ghost !py-1 !px-3 text-destructive">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-editorial text-2xl">Live inventory</h2>
        <div className="mt-4 space-y-3">
          {live.map((l) => (
            <div key={l.id} className="card-warm p-5 flex flex-wrap gap-4 items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{LISTING_STATUS_LABEL[l.status] ?? l.status}</p>
                <p className="font-editorial text-lg">{l.title}</p>
                <p className="text-sm text-muted-foreground">{formatPrice(Number(l.price), l.currency, l.kind as Kind)}</p>
              </div>
              <div className="flex gap-2 text-sm">
                <Link to="/listings/$id" params={{ id: l.id }} className="btn-outline !py-1 !px-3">View</Link>
                {l.status !== "sold" && <button onClick={() => setListingStatus(l.id, "sold")} className="btn-ghost !py-1 !px-3">Mark sold</button>}
                {l.status !== "active" && <button onClick={() => setListingStatus(l.id, "active")} className="btn-ghost !py-1 !px-3">Relist</button>}
              </div>
            </div>
          ))}
          {live.length === 0 && <p className="text-muted-foreground">No inventory yet.</p>}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-editorial text-2xl">Negotiations</h2>
        {!deals || deals.length === 0 ? (
          <p className="text-muted-foreground mt-3">No one is negotiating yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {deals.map((d) => {
              const listing = (d as unknown as { listings: { title: string } | null }).listings;
              return (
                <Link key={d.id} to="/deals/$id" params={{ id: d.id }} className="card-warm p-5 flex flex-wrap gap-3 items-center justify-between hover:border-primary transition">
                  <div className="min-w-0">
                    <p className="font-editorial text-lg line-clamp-1">{listing?.title ?? "Listing"}</p>
                    <p className="text-sm text-muted-foreground">
                      {d.side === "buy" ? "Buyer" : "Seller"}
                      {d.offer_amount ? ` · Offer ${formatAmount(Number(d.offer_amount), d.currency)}` : ""}
                      {d.contact_email ? ` · ${d.contact_email}` : ""}
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
