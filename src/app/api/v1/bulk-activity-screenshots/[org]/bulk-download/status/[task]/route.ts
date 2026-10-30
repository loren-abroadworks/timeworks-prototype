import { NextResponse, type NextRequest } from "next/server";
import { ApiError, respond } from "@/mock/http";
import { bulkDownloadStatus } from "@/mock/screenshots";

type Params = { params: Promise<{ org: string; task: string }> };

/** GET /api/v1/bulk-activity-screenshots/{org}/bulk-download/status/{task} — "preparing" → "ready" after ~1.5 s; download_url is always null (no zip in the replica). */
export async function GET(req: NextRequest, { params }: Params) {
  const { task } = await params;
  try {
    bulkDownloadStatus(task);
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ status: "error", message: e.message }, { status: e.status });
    throw e;
  }
  return respond(req, () => bulkDownloadStatus(task));
}
