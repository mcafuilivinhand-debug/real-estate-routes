import { createFileRoute, Link } from "@tanstack/react-router";
import hero from "@/assets/hero.jpg";
import { CATEGORIES } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ApexAnchor — Property, vehicles and ventures, warmly curated" },
      { name: "description", content: "A slower, more considered marketplace: houses, cars, land, office space, companies and business ideas — for sale or rent." },
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
            <p className="uppercase tracking-[0.2em] text-xs text-primary mb-5">Est. 2026 · A quieter marketplace</p>
            <h1 className="font-editorial text-5xl md:text-6xl leading-[1.05]">
              Property, vehicles<br />and ventures —<br />
              <em className="text-primary not-italic">warmly curated.</em>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Buy or rent homes, cars, land and office space. Or take on an
              established company or a business idea looking for its next owner.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/browse" search={{ kind: "sale" }} className="btn-primary">Browse for sale</Link>
              <Link to="/browse" search={{ kind: "rent" }} className="btn-outline">Browse rentals</Link>
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
          <p className="mt-6 text-sm">Browse for sale →</p>
        </Link>
        <Link to="/browse" search={{ kind: "rent" }} className="card-warm p-10 hover:border-primary transition">
          <p className="text-xs uppercase tracking-widest text-primary">For rent</p>
          <h3 className="font-editorial text-3xl mt-3">Move in this month</h3>
          <p className="text-muted-foreground mt-3">Short and long-term homes, cars and office space near you.</p>
          <p className="mt-6 text-sm">Browse rentals →</p>
        </Link>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 mt-24">
        <div className="border-t border-border pt-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-editorial text-4xl">Have something to list?</h2>
            <p className="text-muted-foreground mt-3 max-w-md">
              Create an account and publish a listing in a few minutes. Buyers
              and renters reach you directly.
            </p>
          </div>
          <div className="flex md:justify-end gap-3">
            <Link to="/sell" className="btn-primary">Create a listing</Link>
            <Link to="/auth" className="btn-outline">Sign in</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
