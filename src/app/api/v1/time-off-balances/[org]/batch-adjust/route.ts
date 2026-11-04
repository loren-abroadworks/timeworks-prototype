import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { batchAdjust } from "@/mock/timeoff";

/** POST /api/v1/time-off-balances/{org}/batch-adjust — body { items: [{ user_id, policy_id, new_balance_hours }], reason }. */
export async function POST(req: NextRequest) {
  return respondWrite(req, (_ctx, body) => batchAdjust(body));
}
