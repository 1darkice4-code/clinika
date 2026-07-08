import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchFormProps = {
  action: string;
  defaultValue?: string;
  placeholder?: string;
  /** Extra params (e.g. active filters) to keep when submitting the search. */
  hidden?: Record<string, string | undefined>;
};

/**
 * Native GET form so it works inside server components without client JS.
 * Submitting resets pagination by omitting `page`.
 */
export function SearchForm({ action, defaultValue, placeholder = "Поиск", hidden = {} }: SearchFormProps) {
  return (
    <form action={action} method="get" className="flex gap-2">
      {Object.entries(hidden).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null
      )}
      <Input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="max-w-xs"
      />
      <Button type="submit" variant="secondary" className="shrink-0">
        <Search className="h-4 w-4" />
        Найти
      </Button>
    </form>
  );
}
