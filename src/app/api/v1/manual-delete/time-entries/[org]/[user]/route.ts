import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { deleteTimeEntry } from "@/mock/timesheets";

type Params = { params: Promise<{ org: string; user: string }> };

/** DELETE /api/v1/manual-delete/time-entries/{org}/{user}?started_at_utc&stopped_at_utc&timezone_str — see deleteTimeEntry for the body. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { user } = await params;
  return respondWrite(req, (_ctx, body) => deleteTimeEntry(user, req.nextUrl.searchParams, body, "manual"));
}
