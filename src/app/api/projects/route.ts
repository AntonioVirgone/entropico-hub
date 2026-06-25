import { type NextRequest, NextResponse } from "next/server";

import { authenticateApiRequest } from "@/lib/api-auth";
import type { ProjectStatus } from "@/lib/types";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth;

  const statusParam = request.nextUrl.searchParams.get("status") as ProjectStatus | null;

  let query = supabase
    .from("projects")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (statusParam === "active" || statusParam === "archived") {
    query = query.eq("status", statusParam);
  }

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  return json({ data: data ?? [] });
}
