import type { NextRequest } from "next/server";
import dayjs from "dayjs";

/** Shared query parsing for the /activity/urls/* mock routes. */
export function urlQuery(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const today = dayjs().format("YYYY-MM-DD");
  const num = (k: string, d: number) => {
    const n = Number(sp.get(k));
    return Number.isFinite(n) && sp.get(k) !== null ? n : d;
  };
  return {
    sp,
    start: sp.get("start_date") || dayjs().subtract(6, "day").format("YYYY-MM-DD"),
    end: sp.get("end_date") || today,
    limit: Math.max(1, Math.min(200, num("limit", 20))),
    offset: Math.max(0, num("offset", 0)),
    search: sp.get("search"),
    userId: sp.get("user_id"),
  };
}
