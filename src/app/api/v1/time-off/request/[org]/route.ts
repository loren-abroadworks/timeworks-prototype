import type { NextRequest } from "next/server";
import { respondForm } from "@/mock/http";
import { createRequest } from "@/mock/timeoff";

/**
 * POST /api/v1/time-off/request/{org} — FormData { data: JSON, files[] } (a JSON body works too).
 * Always creates leave for the logged-in user; auto-approve policies create Approved requests.
 * 400 "Date range overlaps with an existing request (start → end)" when a date is already taken.
 */
export async function POST(req: NextRequest) {
  return respondForm(req, (_ctx, data, files) => createRequest(data, files));
}
