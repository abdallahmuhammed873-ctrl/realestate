import { LOCATION_TREE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function QuickSearch() {
  return (
    <form action="/search" className="grid gap-3 rounded-2xl bg-white p-4 shadow-soft md:grid-cols-5">
      <Select name="transaction" defaultValue="BUY">
        <option value="BUY">Buy</option>
        <option value="RENT">Rent</option>
        <option value="VACATION">Vacation</option>
      </Select>
      <Select name="city" defaultValue="Cairo">
        {Object.keys(LOCATION_TREE).map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </Select>
      <Input name="minPrice" type="number" placeholder="Min Price" />
      <Input name="maxPrice" type="number" placeholder="Max Price" />
      <Button type="submit">Search</Button>
    </form>
  );
}
