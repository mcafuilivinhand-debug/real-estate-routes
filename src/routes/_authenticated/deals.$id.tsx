import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsBroker } from "@/hooks/useBroker";
import {
  BROKER_NAME, DEAL_STATUS_LABEL, categoryLabel, formatAmount, formatPrice,
  type DealStatus, type Kind,
} from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/deals/$id")({
  head: () => ({
    meta: [
      { title: "Negotiation — ApexAnchor" },
      { name: "description", content: "Your private negotiation thread with the ApexAnchor broker." },
      { property: "og:title", content: "Negotiation — ApexAnchor" },
      { property: "og:description", content: "Your private negotiation thread with the ApexAnchor broker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DealThread,
});

const STATUSES: DealStatus[] = ["open", "negotiating", "agreed", "closed", "declined"];

function DealThread() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: isBroker } = useIsBroker(user.id);

  const { data: deal } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, listing_id, client_id, side, status, offer_amount, currency, contact_email, contact_phone, created_at, listings(title, price, currency, kind, category, image_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["deal-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_messages")
        .select("id, body, offer_amount, from_broker, sender_id, created_at")
        .eq("deal_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15_000,
  });

  const [body, setBody] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (body.trim().length < 2) return setErr("Write a message first");
    setBusy(true);
    const offer = amount === "" ? null : Number(amount);
    const { error } = await supabase.from("deal_messages").insert({
      deal_id: id,
      sender_id: user.id,
      from_broker: !!isBroker,
      body: body.trim(),
      offer_amount: offer,
    });
    if (!error && offer !== null) {
      await supabase.from("deals").update({ offer_amount: offer, status: "negotiating" }).eq("id", id);
    } else if (!error && isBroker) {
      await supabase.from("deals").update({ status: "negotiating" }).eq("id", id);
    }
    setBusy(false);
    if (error) return setErr(error.message);
    setBody(""); setAmount("");
    qc.invalidateQueries({ queryKey: ["deal-messages", id] });
    qc.invalidateQueries({ queryKey: ["deal", id] });
  }

  async function setStatus(status: DealStatus) {
    await supabase.from("deals").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["deal", id] });
  }

  if (!deal) return <div className="max-w-3xl mx-auto px-5 py-16 text-muted-foreground">Loading…</div>;

  const listing = (deal as unknown as {
    listings: { title: string; price: number; currency: string; kind: string; category: string; image_url: string | null } | null;
  }).listings;

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <Link to="/deals" className="text-sm underline underline-offset-4 text-muted-foreground">← All negotiations</Link>

      <div className="card-warm p-6 mt-4 flex gap-4 items-center">
        <div className="w-24 h-20 rounded bg-muted overflow-hidden shrink-0">
          {listing?.image_url ? <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" /> : null}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-primary">
            {listing ? categoryLabel(listing.category) : "Listing"} · {DEAL_STATUS_LABEL[deal.status as DealStatus]}
          </p>
          <h1 className="font-editorial text-2xl mt-1 line-clamp-1">{listing?.title ?? "Listing"}</h1>
          {listing && (
            <p className="text-sm text-muted-foreground">
              Asking {formatPrice(Number(listing.price), listing.currency, listing.kind as Kind)}
              {deal.offer_amount ? ` · Current offer ${formatAmount(Number(deal.offer_amount), deal.currency)}` : ""}
            </p>
          )}
        </div>
      </div>

      {isBroker && (
        <div className="card-warm p-5 mt-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Broker controls</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-full text-sm border ${deal.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground"}`}>
                {DEAL_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {(deal.contact_email || deal.contact_phone) && (
            <p className="text-sm text-muted-foreground mt-3">
              Client contact: {deal.contact_email ?? "—"} {deal.contact_phone ? `· ${deal.contact_phone}` : ""}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            <Link to="/listings/$id" params={{ id: deal.listing_id }} className="underline underline-offset-4">Open listing</Link>
          </p>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`max-w-[85%] ${mine ? "ml-auto" : ""}`}>
              <div className={`rounded-md px-4 py-3 border ${mine ? "bg-accent/40 border-border" : "bg-background border-border"}`}>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {m.from_broker ? `${BROKER_NAME} broker` : mine ? "You" : "Client"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-foreground/90">{m.body}</p>
                {m.offer_amount ? (
                  <p className="mt-2 font-editorial text-lg text-primary">
                    {formatAmount(Number(m.offer_amount), deal.currency)}
                  </p>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="mt-8 card-warm p-5 space-y-3">
        <p className="font-editorial text-xl">{isBroker ? "Reply as the broker" : `Message ${BROKER_NAME}`}</p>
        <textarea className="input-field min-h-[100px]" value={body} onChange={(e) => setBody(e.target.value)}
          maxLength={1000} placeholder={isBroker ? "Counter-offer, terms, next steps…" : "Counter, ask a question, or accept…"} />
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Attach a price ({deal.currency}) — optional</label>
          <input className="input-field mt-1" type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button disabled={busy} className="btn-primary disabled:opacity-60" type="submit">{busy ? "Sending…" : "Send"}</button>
      </form>
    </div>
  );
}
