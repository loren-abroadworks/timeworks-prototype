import type { NextRequest } from "next/server";
import { projectsClientsAll } from "@/mock/engine";
import { listOf, rangeOf, respond } from "@/mock/http";

/** GET /api/v1/dashboard/projects-clients-all/{org}?limit&offset&search&filter_user_id&start_date&end_date — "Projects / Clients" sheet. */
export async function GET(req: NextRequest) {
  const { start, end } = rangeOf(req);
  const list = listOf(req);
  return respond(req, (ctx) => projectsClientsAll(ctx, { start, end, ...list }));
}
