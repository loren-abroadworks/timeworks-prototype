import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { createShift } from "@/mock/schedules";

/** POST /api/v1/shift-create/{org} — body { users[], name, shift_type, minimum_hour, shift_buffer_seconds, timezone, days_of_week[], effective_from, effective_to }. */
export async function POST(req: NextRequest) {
  return respondWrite(req, (_ctx, body) => createShift(body));
}
