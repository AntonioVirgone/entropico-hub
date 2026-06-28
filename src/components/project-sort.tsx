"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

import {
  DEFAULT_PROJECT_SORT,
  PROJECT_SORT_OPTIONS,
  type ProjectSort as ProjectSortValue,
} from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Selettore di ordinamento della griglia progetti.
 * La scelta vive nella query string (`?sort=`) così il riordino avviene lato
 * server (Server Component) e resta condivisibile/segnalibile.
 */
export function ProjectSort({ value }: { value: ProjectSortValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next === DEFAULT_PROJECT_SORT) {
      params.delete("sort");
    } else {
      params.set("sort", next);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-auto gap-2" aria-label="Ordina progetti">
        <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROJECT_SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
