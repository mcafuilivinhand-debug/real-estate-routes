import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEAL_STATUS_LABEL, formatAmount, type DealStatus } from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/deals/")({
  head: () => ({
    meta: [
      { title: "Your negotiations — ApexAnchor" },
      { name: "description", content: "Track every negotiation you have running with the ApexAnchor broker." },
      { property: "og:title", content: "Your negotiations — ApexAnchor" },
      { property: "og:description", content: "Track every negotiation you have running with the ApexAnchor broker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  const { user } = Route.useRouteContext();

  const { data: deals } = useQuery({
    queryKey: ["my-deals", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, status, side, offer_amount, currency, created_at, listings(title, image_url)")
        .eq("client_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">With your broker</p>
      <h1 className="font-editorial text-4xl mt-2">Your negotiations</h1>

      {!deals || deals.length === 0 ? (
        <p className="text-muted-foreground mt-6">
          Nothing on the table yet. <Link to="/browse" search={{ kind: "sale" }} className="underline underline-offset-4">Find something</Link> and make an offer.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {deals.map((d) => {
            const listing = (d as unknown as { listings: { title: string; image_url: string | null } | null }).listings;
            return (
              <Link key={d.id} to="/deals/$id" params={{ id: d.id }} className="card-warm p-5 flex gap-4 items-center hover:border-primary transition">
                <div className="w-20 h-16 rounded bg-muted overflow-hidden shrink-0">
                  {listing?.image_url ? <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-editorial text-lg line-clamp-1">{listing?.title ?? "Listing"}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.side === "buy" ? "You're buying" : "You're selling"}
                    {d.offer_amount ? ` · Your offer ${formatAmount(Number(d.offer_amount), d.currency)}` : ""}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-widest text-primary shrink-0">
                  {DEAL_STATUS_LABEL[d.status as DealStatus]}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
