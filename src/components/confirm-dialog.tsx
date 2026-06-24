"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  /** Impostare a false per nascondere il bottone Annulla (modalità alert). */
  showCancel?: boolean;
  cancelLabel?: string;
  variant?: "destructive" | "default";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: (value: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true, resolve });
    });
  }, []);

  function handleConfirm() {
    resolveRef.current?.(true);
    setState(null);
  }

  function handleCancel() {
    resolveRef.current?.(false);
    setState(null);
  }

  const dialog = state ? (
    <Dialog open={state.open} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{state.title ?? "Conferma"}</DialogTitle>
          <DialogDescription>{state.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          {state.showCancel !== false && (
            <Button variant="outline" onClick={handleCancel}>
              {state.cancelLabel ?? "Annulla"}
            </Button>
          )}
          <Button
            variant={state.variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {state.confirmLabel ?? "Ok"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  return { confirm, dialog };
}
