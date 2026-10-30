import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { splitTimeEntry } from "@/mock/timesheets";

type Params = { params: Promise<{ org: string; user: string }> };

/** PUT /api/v1/split/time-entries-slot/{org}/{user}?timezone_str[&started_at&stopped_at] — see splitTimeEntry for the body. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { user } = await params;
  return respondWrite(req, (_ctx, body) => splitTimeEntry(user, req.nextUrl.searchParams, body));
}
