import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { urlAdmin } from "@/mock/urls";
import { urlQuery } from "@/mock/url-params";

/** GET /api/v1/activity/urls/{org}/admin?start_date&end_date&user_id&search&limit&offset — "Employee URL Management" sheet (day / week cells). */
export async function GET(req: NextRequest) {
  const q = urlQuery(req);
  return respond(req, (ctx) => urlAdmin(ctx, q));
}
