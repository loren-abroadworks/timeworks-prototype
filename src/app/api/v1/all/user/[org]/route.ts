import type { NextRequest } from "next/server";
import { allMembers } from "@/mock/engine";
import { respond } from "@/mock/http";

/** GET /api/v1/all/user/{org} — member options for the member filter. */
export async function GET(req: NextRequest) {
  return respond(req, () => allMembers());
}
