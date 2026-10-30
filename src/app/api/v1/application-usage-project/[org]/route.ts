import type { NextRequest } from "next/server";
import dayjs from "dayjs";
import { respond } from "@/mock/http";
import { applicationUsage } from "@/mock/app-usage";

/** GET /api/v1/application-usage-project/{org}?date&timezone&user_id&project_id — Activity › App (["app-usage","projects",…]). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return respond(req, (ctx) =>
    applicationUsage(ctx, { date: sp.get("date") || dayjs().format("YYYY-MM-DD"), timezone: sp.get("timezone"), userId: sp.get("user_id"), projectId: sp.get("project_id") }),
  );
}
