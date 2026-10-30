import type { NextRequest } from "next/server";
import dayjs from "dayjs";
import { respond } from "@/mock/http";
import { urlDrilldown } from "@/mock/urls";
import { urlQuery } from "@/mock/url-params";

/** GET /api/v1/activity/urls/{org}/drilldown?date&user_id&date_end&group_by_day&search&limit&offset — month / year cell sheet (days with link counts). */
export async function GET(req: NextRequest) {
  const q = urlQuery(req);
  return respond(req, (ctx) => urlDrilldown(ctx, { ...q, date: q.sp.get("date") || dayjs().format("YYYY-MM-DD"), dateEnd: q.sp.get("date_end") }));
}
