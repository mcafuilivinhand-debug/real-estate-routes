export const CATEGORIES = [
  { id: "house", label: "Houses", tagline: "Homes to live in and love" },
  { id: "car", label: "Cars", tagline: "Vehicles for the road ahead" },
  { id: "land", label: "Land", tagline: "Ground to build something on" },
  { id: "office", label: "Office space", tagline: "Rooms for teams to grow" },
  { id: "company", label: "Companies", tagline: "Established ventures for sale" },
  { id: "business_idea", label: "Business ideas", tagline: "Blueprints seeking a builder" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type Kind = "sale" | "rent";

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

// Categories that make sense for each kind
export const RENTABLE: CategoryId[] = ["house", "car", "office"];
export const SELLABLE: CategoryId[] = ["house", "car", "land", "office", "company", "business_idea"];

export function formatPrice(price: number, currency: string, kind: Kind) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency || "USD", maximumFractionDigits: 0,
  }).format(price);
  return kind === "rent" ? `${formatted} / mo` : formatted;
}
