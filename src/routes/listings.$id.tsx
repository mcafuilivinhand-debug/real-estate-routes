import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BROKER_NAME, categoryLabel, formatPrice, type Kind } from "@/lib/marketplace";

export const Route = createFileRoute("/listings/$id")({
  head: () => ({
    meta: [
      { title: "Listing — ApexAnchor" },
      { name: "description", content: "Listing details, pricing and how to make an offer on ApexAnchor." },
      { property: "og:title", content: "Listing — ApexAnchor" },
      { property: "og:description", content: "Make a private offer on this listing through ApexAnchor." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListingPage,
});

const enquirySchema = z.object({
  message: z.string().trim().min(5, "Tell us a little more").max(1000),
  offer_amount: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
  contact_email: z.string().trim().email().max(255).optional().or(z.literal("")),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
});

function ListingPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, description, price, currency, kind, category, location, image_url, status")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  const [message, setMessage] = useState("");
  const [offer, setOffer] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function startDeal(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!session) return navigate({ to: "/auth" });

    const parsed = enquirySchema.safeParse({
      message,
      offer_amount: offer === "" ? "" : offer,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    });
    if (!parsed.success) return setErr(parsed.error.issues[0].message);

    const isRental = listing?.kind === "rent";
    if (isRental && startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return setErr("The end date must come after the start date");
    }
    setSending(true);

    const amount = typeof parsed.data.offer_amount === "number" ? parsed.data.offer_amount : null;
    const { data: deal, error } = await supabase
      .from("deals")
      .insert({
        listing_id: id,
        client_id: session.user.id,
        side: "buy",
        status: "open",
        offer_amount: amount,
        currency: listing?.currency ?? "USD",
        contact_email: parsed.data.contact_email || null,
        contact_phone: parsed.data.contact_phone || null,
        start_date: isRental && startDate ? startDate : null,
        end_date: isRental && endDate ? endDate : null,
      })
      .select("id")
      .single();

    if (error || !deal) {
      setSending(false);
      return setErr(error?.message ?? "Could not send your enquiry");
    }

    const { error: msgErr } = await supabase.from("deal_messages").insert({
      deal_id: deal.id,
      sender_id: session.user.id,
      from_broker: false,
      body: parsed.data.message,
      offer_amount: amount,
    });
    setSending(false);
    if (msgErr) return setErr(msgErr.message);
    navigate({ to: "/deals/$id", params: { id: deal.id } });
  }

  if (isLoading) return <div className="max-w-4xl mx-auto px-5 py-16 text-muted-foreground">Loading…</div>;
  if (!listing) return (
    <div className="max-w-4xl mx-auto px-5 py-16 text-center">
      <h1 className="font-editorial text-3xl">Listing not found</h1>
      <Link to="/browse" search={{ kind: "sale" }} className="btn-outline mt-6 inline-flex">Back to browse</Link>
    </div>
  );

  const kind = listing.kind as Kind;

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">
        {kind === "rent" ? "For rent" : "For sale"} · {categoryLabel(listing.category)}
      </p>
      <h1 className="font-editorial text-4xl md:text-5xl mt-2">{listing.title}</h1>
      <p className="text-muted-foreground mt-1">{listing.location || "Location not specified"}</p>

      <div className="grid md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-2">
          <div className="aspect-[4/3] bg-muted rounded-md overflow-hidden">
            {listing.image_url ? (
              <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">No image</div>
            )}
          </div>
          <div className="mt-8">
            <h2 className="font-editorial text-2xl">About</h2>
            <p className="mt-3 whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {listing.description || "No description provided."}
            </p>
          </div>
          <div className="mt-8 card-warm p-6">
            <p className="text-xs uppercase tracking-widest text-primary">How this works</p>
            <p className="mt-2 text-foreground/90 leading-relaxed">
              Send {BROKER_NAME} your offer and any questions. Our team reviews it, confirms
              availability and gets back to you with the answer — all in one private thread.
            </p>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card-warm p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{kind === "rent" ? "Monthly asking" : "Asking price"}</p>
            <p className="font-editorial text-3xl mt-1">{formatPrice(Number(listing.price), listing.currency, kind)}</p>
            <div className="rule my-5" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Handled by</p>
            <p className="mt-1">{BROKER_NAME}</p>
            <p className="text-sm text-muted-foreground mt-1">Seller details stay private.</p>
          </div>

          <div className="card-warm p-6">
            <p className="font-editorial text-xl">{kind === "rent" ? "Request these dates" : "Make an offer"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {kind === "rent" ? "Pick your dates and name your rate." : "Name your price. We'll take it from there."}
            </p>
            <form onSubmit={startDeal} className="mt-4 space-y-3">
              {kind === "rent" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">From</label>
                    <input className="input-field mt-1" type="date" value={startDate}
                      onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">To</label>
                    <input className="input-field mt-1" type="date" value={endDate} min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  {kind === "rent" ? `Your monthly offer (${listing.currency})` : `Your offer (${listing.currency})`}
                </label>
                <input className="input-field mt-1" type="number" min="0" step="1" placeholder="Optional"
                  value={offer} onChange={(e) => setOffer(e.target.value)} />
              </div>
              <textarea className="input-field min-h-[110px]" placeholder="Hi, I'm interested — here's what I can do…"
                value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required />
              <input className="input-field" placeholder="Your email (optional)" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={255} />
              <input className="input-field" placeholder="Phone (optional)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={40} />
              {err && <p className="text-sm text-destructive">{err}</p>}
              <button disabled={sending} className="btn-primary w-full disabled:opacity-60" type="submit">
                {sending ? "Sending…" : session ? "Send offer" : "Sign in to make an offer"}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
