import { createFileRoute, Link } from "@tanstack/react-router";
import hero from "@/assets/hero.jpg";
import { CATEGORIES } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ApexAnchor — Property, vehicles and ventures for sale or rent" },
      { name: "description", content: "Houses, cars, land, office space, companies and business ideas — for sale or rent. Discover, compare and make offers in one place." },
      { property: "og:title", content: "ApexAnchor — Buy, sell or rent with confidence" },
      { property: "og:description", content: "Homes, cars, land, offices and companies — all in one marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-8 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="uppercase tracking-[0.2em] text-xs text-primary mb-5">Est. 2026 · Marketplace</p>
            <h1 className="font-editorial text-5xl md:text-6xl leading-[1.05]">
              One broker between<br />every buyer<br />
              <em className="text-primary not-italic">and every seller.</em>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Buy or rent homes, cars, land and office space — or take on a whole
              company. You don't chase owners: you negotiate the price with us,
              and we settle it with the other side.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/browse" search={{ kind: "sale" }} className="btn-primary">Browse to buy</Link>
              <Link to="/browse" search={{ kind: "rent" }} className="btn-outline">Browse to rent</Link>
            </div>
          </div>
          <div className="relative">
            <img
              src={hero}
              alt="Sunlit villa entrance with a vintage car at golden hour"
              width={1600}
              height={1100}
              className="w-full h-[420px] md:h-[540px] object-cover rounded-md shadow-lg"
            />
            <div className="absolute -bottom-4 -left-4 bg-background border border-border px-4 py-3 rounded-md shadow">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">This week</p>
              <p className="font-editorial text-xl">142 new listings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-5 mt-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Categories</p>
            <h2 className="font-editorial text-4xl mt-2">What are you looking for?</h2>
          </div>
          <Link to="/browse" search={{ kind: "sale" }} className="hidden sm:inline text-sm underline underline-offset-4">View everything →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to="/browse"
              search={{ kind: "sale", category: c.id }}
              className="group bg-background p-8 hover:bg-accent/40 transition"
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{c.id.replace("_", " ")}</p>
              <p className="font-editorial text-2xl mt-2 group-hover:text-primary transition">{c.label}</p>
              <p className="text-sm text-muted-foreground mt-2">{c.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Two lanes */}
      <section className="max-w-6xl mx-auto px-5 mt-24 grid md:grid-cols-2 gap-6">
        <Link to="/browse" search={{ kind: "sale" }} className="card-warm p-10 hover:border-primary transition">
          <p className="text-xs uppercase tracking-widest text-primary">For sale</p>
          <h3 className="font-editorial text-3xl mt-3">Own something lasting</h3>
          <p className="text-muted-foreground mt-3">Homes, land, cars and whole companies — vetted and ready.</p>
          <p className="mt-6 text-sm">Browse to buy →</p>
        </Link>
        <Link to="/browse" search={{ kind: "rent" }} className="card-warm p-10 hover:border-primary transition">
          <p className="text-xs uppercase tracking-widest text-primary">For rent</p>
          <h3 className="font-editorial text-3xl mt-3">Move in this month</h3>
          <p className="text-muted-foreground mt-3">Short and long-term homes, cars and office space near you.</p>
          <p className="mt-6 text-sm">Browse to rent →</p>
        </Link>
      </section>

      {/* How brokering works */}
      <section className="max-w-6xl mx-auto px-5 mt-24">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">How it works</p>
        <h2 className="font-editorial text-4xl mt-2">We stand in the middle</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
          {[
            { n: "01", t: "Sellers hand it over", d: "Owners place a house, car, land, office or company with us. We review it before it ever goes on the market." },
            { n: "02", t: "Buyers negotiate with us", d: "Interested? Make your offer to ApexAnchor. No cold calls to strangers, no exposed phone numbers." },
            { n: "03", t: "We close the gap", d: "We carry offers and counter-offers between both sides until the price is agreed, then walk the deal to the finish." },
          ].map((s) => (
            <div key={s.n} className="bg-background p-8">
              <p className="font-editorial text-3xl text-primary">{s.n}</p>
              <p className="font-editorial text-2xl mt-2">{s.t}</p>
              <p className="text-sm text-muted-foreground mt-2">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 mt-24">
        <div className="border-t border-border pt-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-editorial text-4xl">Have something to sell or rent out?</h2>
            <p className="text-muted-foreground mt-3 max-w-md">
              Hand it to us. We review it, market it, screen the buyers and
              negotiate on your behalf — your details never go public.
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
