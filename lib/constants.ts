export const AMENITIES = [
  "A/C",
  "Balcony",
  "Parking",
  "Pool",
  "Gym",
  "Pets Allowed",
  "Elevator",
  "Security",
  "Garden",
  "Storage"
];

export const LOCATION_TREE: Record<string, Record<string, string[]>> = {
  Cairo: {
    "New Cairo": ["Fifth Settlement", "North 90 Street", "South Academy"],
    Heliopolis: ["Korba", "El Nozha", "Ard El Golf"],
    Maadi: ["Degla", "Sarayat", "Zahraa Maadi"]
  },
  Giza: {
    "6th of October": ["Beverly Hills", "October Gardens", "Al Ashgar"],
    SheikhZayed: ["Allegria", "Zayed 2000", "Greens"]
  }
};

export const SORT_OPTIONS = [
  { value: "FEATURED", label: "Featured" },
  { value: "NEWEST", label: "Newest" },
  { value: "PRICE_ASC", label: "Price Low to High" },
  { value: "PRICE_DESC", label: "Price High to Low" },
  { value: "AREA_DESC", label: "Largest Area" },
  { value: "DISTANCE_ASC", label: "Nearest" }
] as const;
