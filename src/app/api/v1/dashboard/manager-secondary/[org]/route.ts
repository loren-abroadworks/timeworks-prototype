import type { NextRequest } from "next/server";
import { managerSecondary } from "@/mock/engine";
import { rangeOf, respond } from "@/mock/http";

/** GET /api/v1/dashboard/manager-secondary/{org}?start_date&end_date&type=manager — Low Activity, Members, Limits. */
export async function GET(req: NextRequest) {
  const { start, end } = rangeOf(req);
  return respond(req, (ctx) => managerSecondary(ctx, start, end));
}
