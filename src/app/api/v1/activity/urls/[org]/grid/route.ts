import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { urlGrid, type GridMode } from "@/mock/urls";
import { urlQuery } from "@/mock/url-params";

/** GET /api/v1/activity/urls/{org}/grid?start_date&end_date&mode&limit&offset&search_employee&client_id&team_id&project_id — URL management grid. */
export async function GET(req: NextRequest) {
  const q = urlQuery(req);
  const mode = (["day", "week", "month", "year"].includes(q.sp.get("mode") ?? "") ? q.sp.get("mode") : "week") as GridMode;
  return respond(req, (ctx) =>
    urlGrid(ctx, {
      ...q,
      mode,
      searchEmployee: q.sp.get("search_employee"),
      clientIds: q.sp.getAll("client_id").map(Number).filter(Boolean),
      teamIds: q.sp.getAll("team_id").map(Number).filter(Boolean),
      projectIds: q.sp.getAll("project_id").filter(Boolean),
    }),
  );
}
