import { Language, t, translateLocation, translateTransaction } from "@/lib/i18n";
import { LOCATION_TREE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function QuickSearch({ language }: { language: Language }) {
  return (
    <form
      action="/search"
      className="grid gap-3 rounded-2xl bg-white/80 p-4 shadow-soft backdrop-blur md:grid-cols-5"
    >
      <Select name="transaction" defaultValue="BUY">
        <option value="BUY">{translateTransaction("BUY", language)}</option>
        <option value="RENT">{translateTransaction("RENT", language)}</option>
        <option value="VACATION">{translateTransaction("VACATION", language)}</option>
      </Select>
      <Select name="city" defaultValue="Cairo">
        {Object.keys(LOCATION_TREE).map((city) => (
          <option key={city} value={city}>
            {translateLocation(city, language)}
          </option>
        ))}
      </Select>
      <Input name="minPrice" type="number" placeholder={t(language, "minPrice")} />
      <Input name="maxPrice" type="number" placeholder={t(language, "maxPrice")} />
      <Button type="submit">{t(language, "search")}</Button>
    </form>
  );
}
