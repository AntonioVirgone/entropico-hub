"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Selettore multiplo a chip: catalogo predefinito + aggiunta di valori custom.
 * I valori selezionati vengono inviati nel form come input nascosti con `name`.
 */
export function TechMultiSelect({
  name,
  label,
  options,
  value,
  onChange,
  placeholder = "Aggiungi…",
}: {
  name: string;
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [custom, setCustom] = useState("");

  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }

  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setCustom("");
  }

  // Valori selezionati che non sono nel catalogo (aggiunti a mano)
  const customSelected = value.filter((v) => !options.includes(v));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Valori inviati nel form */}
      {value.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}

      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const selected = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:bg-muted/50"
              )}
            >
              {selected && <Check className="h-3 w-3" />}
              {opt}
            </button>
          );
        })}

        {/* Chip per i valori custom selezionati (rimovibili) */}
        {customSelected.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors cursor-pointer"
          >
            {v}
            <X className="h-3 w-3" />
          </button>
        ))}
      </div>

      {/* Aggiunta valore custom */}
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={addCustom}
          aria-label="Aggiungi"
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/50 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
