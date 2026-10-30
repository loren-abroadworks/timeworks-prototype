import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { viewByDate } from "@/mock/urls";
import { urlQuery } from "@/mock/url-params";

/** GET /api/v1/activity/urls/{org}/view_by_date?start_date&end_date&user_id — domains + URLs of one day. */
export async function GET(req: NextRequest) {
  const q = urlQuery(req);
  return respond(req, (ctx) => viewByDate(ctx, { ...q, end: q.sp.get("end_date") || q.start }));
}
