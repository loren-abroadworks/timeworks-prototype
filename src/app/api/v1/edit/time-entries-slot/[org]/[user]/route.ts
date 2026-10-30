import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { editTimeEntry } from "@/mock/timesheets";

type Params = { params: Promise<{ org: string; user: string }> };

/** PUT /api/v1/edit/time-entries-slot/{org}/{user}?old_started_at&old_stopped_at&timezone_str — see editTimeEntry for the body. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { user } = await params;
  return respondWrite(req, (_ctx, body) => editTimeEntry(user, req.nextUrl.searchParams, body, true));
}
