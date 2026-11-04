import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { adjustBalance } from "@/mock/timeoff";

type Params = { params: Promise<{ org: string; policy: string; user: string }> };

/** PUT /api/v1/time-off-balances/{org}/{policy}/members/{user} — body { new_balance_hours, reason } (Adjust Balance). */
export async function PUT(req: NextRequest, { params }: Params) {
  const { policy, user } = await params;
  return respondWrite(req, (_ctx, body) => adjustBalance(Number(policy), user, body));
}
export const PATCH = PUT;
