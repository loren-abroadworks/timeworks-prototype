import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { bulkDeleteTimeEntries } from "@/mock/timesheets";

type Params = { params: Promise<{ org: string; user: string }> };

/** POST /api/v1/bulk-delete/time-entries/{org}/{user} — body {timezone_str, items:[{started_at_utc, stopped_at_utc, type, local_activity_duration_id?, reasons?}]}. */
export async function POST(req: NextRequest, { params }: Params) {
  const { user } = await params;
  return respondWrite(req, (_ctx, body) => bulkDeleteTimeEntries(user, body));
}
