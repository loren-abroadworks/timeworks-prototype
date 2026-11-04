import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { updateShiftRule } from "@/mock/schedules";

type Params = { params: Promise<{ org: string; user: string }> };

/** PUT /api/v1/user/shift-rule-update/{org}/{user}?effective_from= — "This and all future shifts". */
export async function PUT(req: NextRequest, { params }: Params) {
  const { user } = await params;
  const from = req.nextUrl.searchParams.get("effective_from") ?? "";
  return respondWrite(req, (_ctx, body) => updateShiftRule(user, from, body));
}
