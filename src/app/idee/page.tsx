import { Lightbulb, Plus } from "lucide-react";

import { getProjectIdeas } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { IdeaCard } from "@/components/idea-card";
import { IdeaDialog } from "@/components/idea-dialog";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ideas = await getProjectIdeas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backlog idee</h1>
          <p className="text-sm text-muted-foreground">
            Nuovi progetti da realizzare, anche in futuro. Memo indipendente
            dalle todo-list dei progetti.
          </p>
        </div>
        <IdeaDialog
          trigger={
            <Button>
              <Plus /> Nuova idea
            </Button>
          }
        />
      </div>

      {ideas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Nessuna idea nel backlog. Annota il prossimo progetto da realizzare.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
