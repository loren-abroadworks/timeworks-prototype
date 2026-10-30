import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { myUrls } from "@/mock/urls";
import { urlQuery } from "@/mock/url-params";

/** GET /api/v1/activity/urls/{org}/me?start_date&end_date&timezone&limit&offset&search — My URLs day list (logged-in user). */
export async function GET(req: NextRequest) {
  const q = urlQuery(req);
  return respond(req, (ctx) => myUrls(ctx, { ...q, userId: undefined }));
}
