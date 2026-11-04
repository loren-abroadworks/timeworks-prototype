import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { updateShift } from "@/mock/schedules";

type Params = { params: Promise<{ org: string; user: string }> };

/** PUT /api/v1/shift-update/{org}/{user} — "Only this shift": body { shift_date, start_time, end_time, shift_type, minimum_hour, … }. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { user } = await params;
  return respondWrite(req, (_ctx, body) => updateShift(user, body));
}
