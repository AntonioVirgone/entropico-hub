import { getApiTokens } from "@/lib/queries";
import { TokenManager } from "@/components/token-manager";

export const dynamic = "force-dynamic";

export default async function TokenPage() {
  const tokens = await getApiTokens();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Token API</h1>
        <p className="text-sm text-muted-foreground">
          Token personali per l&apos;API documentazione. Usali come Bearer per
          caricare e consultare i documenti dei tuoi progetti. Ogni token vale
          solo per i progetti del tuo account.
        </p>
      </div>

      <TokenManager tokens={tokens} />
    </div>
  );
}
