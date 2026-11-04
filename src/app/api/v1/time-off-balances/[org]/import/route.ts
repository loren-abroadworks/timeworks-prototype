import type { NextRequest } from "next/server";
import { respondForm } from "@/mock/http";

/** POST /api/v1/time-off-balances/{org}/import — stub: accepts the upload, imports nothing. */
export async function POST(req: NextRequest) {
  return respondForm(req, (_ctx, _data, files) => ({ status: "success", message: "Import received — the replica does not apply imported balances", files: files.length, imported: 0 }));
}
