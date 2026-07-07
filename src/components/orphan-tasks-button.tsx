"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";

import { migrateOrphanTasksToGenericEpic } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-dialog";

/**
 * Bottone visibile solo se il progetto ha task senza epica assegnata
 * (epic_id null, es. creati dall'API pubblica). Un click li sposta tutti
 * nell'epica "Generica" del progetto, creandola se non esiste ancora.
 */
export function OrphanTasksButton({
  projectId,
  orphanCount,
}: {
  projectId: string;
  orphanCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { confirm, dialog } = useConfirm();

  if (orphanCount === 0) return null;

  async function handleClick() {
    setPending(true);
    try {
      const result = await migrateOrphanTasksToGenericEpic(projectId);
      if (result.ok) {
        await confirm({
          title: "Task sistemati",
          description: `${result.count} task senza epica ${result.count === 1 ? "è stato spostato" : "sono stati spostati"} nell'epica "Generica".`,
          confirmLabel: "Ok",
          showCancel: false,
        });
        router.refresh();
      } else {
        await confirm({
          title: "Errore",
          description: result.error,
          confirmLabel: "Ok",
          showCancel: false,
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={handleClick} disabled={pending}>
        <Wand2 />
        {pending
          ? "Sistemazione…"
          : `Sistema ${orphanCount} task senza epica`}
      </Button>
      {dialog}
    </>
  );
}
