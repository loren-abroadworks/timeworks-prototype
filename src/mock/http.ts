/**
 * Shared plumbing for the mock route handlers: scenario + artificial latency + JSON response.
 *
 *  Scenario ("default" | "empty") is taken from, in order:
 *    ?scenario=…  on the API request  →  cookie "tw_scenario" (set by visiting any page with ?scenario=…)
 *    →  env MOCK_SCENARIO  →  "default"
 *  Latency (ms) is taken from ?latency=…  →  cookie "tw_latency"  →  env MOCK_LATENCY_MS  →  seed MOCK_SETTINGS.latencyMs
 */
import { NextResponse, type NextRequest } from "next/server";
import type { Ctx, Scenario } from "./engine";
import { defaultRange } from "./engine";
import { MOCK_SETTINGS } from "./seed";

export function getCtx(req: NextRequest): Ctx {
  const raw = req.nextUrl.searchParams.get("scenario") ?? req.cookies.get("tw_scenario")?.value ?? process.env.MOCK_SCENARIO ?? "default";
  const scenario: Scenario = raw === "empty" ? "empty" : "default";
  return { scenario };
}

function getLatency(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("latency") ?? req.cookies.get("tw_latency")?.value ?? process.env.MOCK_LATENCY_MS;
  const n = raw !== undefined ? Number(raw) : MOCK_SETTINGS.latencyMs;
  return Number.isFinite(n) && n >= 0 ? n : MOCK_SETTINGS.latencyMs;
}

/** Wraps a handler: waits the configured latency, then returns its result as JSON. */
export async function respond<T>(req: NextRequest, build: (ctx: Ctx) => T) {
  const latency = getLatency(req);
  if (latency > 0) await new Promise((r) => setTimeout(r, latency));
  try {
    return NextResponse.json(build(getCtx(req)));
  } catch (err) {
    return NextResponse.json({ status: "error", message: String(err) }, { status: 500 });
  }
}

/** start_date / end_date with the dashboard's default (last 30 days ending today). */
export function rangeOf(req: NextRequest) {
  const d = defaultRange();
  const sp = req.nextUrl.searchParams;
  return { start: sp.get("start_date") || d.start, end: sp.get("end_date") || d.end };
}

/** limit / offset / search / filter_user_id for the "View All" endpoints. */
export function listOf(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.max(1, Math.min(200, Number(sp.get("limit") ?? 20) || 20));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  return {
    limit,
    offset,
    search: sp.get("search") || undefined,
    filterUserId: sp.get("filter_user_id") || undefined,
  };
}
