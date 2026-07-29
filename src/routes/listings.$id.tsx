import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, formatPrice, type Kind } from "@/lib/marketplace";

export const Route = createFileRoute("/listings/$id")({
  head: () => ({
    meta: [
      { title: "Listing — ApexAnchor" },
      { name: "description", content: "Listing details on ApexAnchor." },
    ],
  }),
  component: ListingPage,
});

const inquirySchema = z.object({
  message: z.string().trim().min(5, "Say a little more").max(1000),
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
        .select("*, profiles!listings_owner_id_fkey(display_name, phone)")
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
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sendInquiry(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!session) {
      navigate({ to: "/auth" });
      return;
    }
    const parsed = inquirySchema.safeParse({ message, contact_email: contactEmail, contact_phone: contactPhone });
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    setSending(true);
    const { error } = await supabase.from("inquiries").insert({
      listing_id: id,
      sender_id: session.user.id,
      message: parsed.data.message,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
    });
    setSending(false);
    if (error) return setErr(error.message);
    setSent(true);
    setMessage("");
  }

  if (isLoading) return <div className="max-w-4xl mx-auto px-5 py-16 text-muted-foreground">Loading…</div>;
  if (!listing) return (
    <div className="max-w-4xl mx-auto px-5 py-16 text-center">
      <h1 className="font-editorial text-3xl">Listing not found</h1>
      <Link to="/browse" search={{ kind: "sale" }} className="btn-outline mt-6 inline-flex">Back to browse</Link>
    </div>
  );

  const kind = listing.kind as Kind;
  const ownerName = (listing as unknown as { profiles?: { display_name?: string; phone?: string } }).profiles?.display_name ?? "Owner";

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
        </div>

        <aside className="space-y-6">
          <div className="card-warm p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{kind === "rent" ? "Monthly" : "Price"}</p>
            <p className="font-editorial text-3xl mt-1">{formatPrice(Number(listing.price), listing.currency, kind)}</p>
            <div className="rule my-5" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Listed by</p>
            <p className="mt-1">{ownerName}</p>
          </div>

          <div className="card-warm p-6">
            <p className="font-editorial text-xl">Contact seller</p>
            {sent ? (
              <p className="text-sm text-primary mt-3">Message sent. They'll get back to you.</p>
            ) : (
              <form onSubmit={sendInquiry} className="mt-4 space-y-3">
                <textarea className="input-field min-h-[110px]" placeholder="Hi, I'm interested in this listing…"
                  value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required />
                <input className="input-field" placeholder="Your email (optional)" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={255} />
                <input className="input-field" placeholder="Phone (optional)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={40} />
                {err && <p className="text-sm text-destructive">{err}</p>}
                <button disabled={sending} className="btn-primary w-full disabled:opacity-60" type="submit">
                  {sending ? "Sending…" : session ? "Send message" : "Sign in to send"}
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
