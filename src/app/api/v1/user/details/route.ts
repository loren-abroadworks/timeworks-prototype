import type { NextRequest } from "next/server";
import { userDetails } from "@/mock/engine";
import { respond } from "@/mock/http";

/** GET /api/v1/user/details — the logged-in (demo) user. */
export async function GET(req: NextRequest) {
  return respond(req, () => userDetails());
}
