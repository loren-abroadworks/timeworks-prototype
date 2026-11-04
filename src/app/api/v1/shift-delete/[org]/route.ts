import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { deleteShift } from "@/mock/schedules";

/** DELETE /api/v1/shift-delete/{org} — body { user_id, shift_date, shift_rule_id }. */
export async function DELETE(req: NextRequest) {
  return respondWrite(req, (_ctx, body) => deleteShift(body));
}
