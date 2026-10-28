import { NextResponse, type NextRequest } from "next/server";

/**
 * Lets you switch mock scenarios from the browser address bar:
 *   /dashboard/<id>/my_dashboard?scenario=empty    → all API calls return empty data (empty states)
 *   …?scenario=default                             → back to normal dummy data
 *   …?latency=0 / ?latency=1500                    → change the artificial API delay
 * The choice is remembered in a cookie that the mock API reads.
 */
export function middleware(req: NextRequest) {
  const scenario = req.nextUrl.searchParams.get("scenario");
  const latency = req.nextUrl.searchParams.get("latency");
  if (!scenario && !latency) return NextResponse.next();
  const res = NextResponse.next();
  if (scenario) res.cookies.set("tw_scenario", scenario, { path: "/" });
  if (latency) res.cookies.set("tw_latency", latency, { path: "/" });
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|assets|fonts|mock-screens|mock-avatars|.*\\.svg|.*\\.png).*)"],
};
