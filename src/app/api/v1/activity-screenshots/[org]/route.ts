import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { activityScreenshots } from "@/mock/screenshots";

/**
 * GET /api/v1/activity-screenshots/{org}?activity_date&timezone&view_mode=every_ten_minutes|all_records&user_id
 * Used by Activity › Screenshots (key ["screenshots",org,query,tz]) and the Dashboard's Recent Screenshots.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return respond(req, (ctx) =>
    activityScreenshots(ctx, { date: sp.get("activity_date"), timezone: sp.get("timezone"), viewMode: sp.get("view_mode"), userId: sp.get("user_id") }),
  );
}
