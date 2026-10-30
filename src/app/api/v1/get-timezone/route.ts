import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { timezoneListing } from "@/mock/tz";

/** GET /api/v1/get-timezone — time-zone list for the timezone selector (TIMEZONE_LISTING). */
export async function GET(req: NextRequest) {
  return respond(req, () => timezoneListing());
}
