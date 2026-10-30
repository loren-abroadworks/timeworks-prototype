import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { addTimeEntry } from "@/mock/timesheets";

type Params = { params: Promise<{ org: string; user: string }> };

/** POST /api/v1/add/time-entries/{org}/{user}?timezone_str= — body {started_at_utc, stopped_at_utc, project_id, task_id, notes} (local times). */
export async function POST(req: NextRequest, { params }: Params) {
  const { user } = await params;
  return respondWrite(req, (_ctx, body) => addTimeEntry(user, req.nextUrl.searchParams.get("timezone_str") ?? "", body));
}
