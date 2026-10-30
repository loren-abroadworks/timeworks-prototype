import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { startBulkDownload } from "@/mock/screenshots";

/**
 * POST /api/v1/bulk-activity-screenshots/{org}/bulk-download/async
 * body { member_id, start_date, end_date, timezone } → { status: "started", task_id } | { status: "empty" }.
 * Stub: no zip is ever built (see the status endpoint).
 */
export async function POST(req: NextRequest) {
  return respondWrite(req, (_ctx, body) => startBulkDownload(body));
}
