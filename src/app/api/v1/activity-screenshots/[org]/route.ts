import dayjs from "dayjs";
import type { NextRequest } from "next/server";
import { activityScreenshots } from "@/mock/engine";
import { respond } from "@/mock/http";

/** GET /api/v1/activity-screenshots/{org}?activity_date&timezone&view_mode=every_ten_minutes|all_records&user_id */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const date = sp.get("activity_date") || dayjs().format("YYYY-MM-DD");
  const viewMode = sp.get("view_mode") || "every_ten_minutes";
  const userId = sp.get("user_id") || undefined;
  return respond(req, (ctx) => activityScreenshots(ctx, { date, viewMode, userId }));
}
