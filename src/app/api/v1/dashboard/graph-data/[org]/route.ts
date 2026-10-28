import type { NextRequest } from "next/server";
import { graphData } from "@/mock/engine";
import { rangeOf, respond } from "@/mock/http";

/** GET /api/v1/dashboard/graph-data/{org}?start_date&end_date&type=manager — Company Performance Chart. */
export async function GET(req: NextRequest) {
  const { start, end } = rangeOf(req);
  return respond(req, (ctx) => graphData(ctx, start, end));
}
