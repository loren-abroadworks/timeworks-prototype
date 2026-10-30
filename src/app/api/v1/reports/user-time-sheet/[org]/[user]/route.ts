import { NextResponse, type NextRequest } from "next/server";
import { getCtx, respond } from "@/mock/http";
import { exportRows, toCsvText, toPdf, userTimesheet, type TimesheetQuery } from "@/mock/timesheets";
import { dayjs } from "@/mock/tz";

type Params = { params: Promise<{ org: string; user: string }> };

/**
 * GET /api/v1/reports/user-time-sheet/{org}/{user}?start_date&end_date&timezone_str&offset&limit[&project_id&time_type&activity_level]
 * With &export_type=excel|pdf it returns a file instead (CSV for "excel", a simple PDF for "pdf").
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { user } = await params;
  const sp = req.nextUrl.searchParams;
  const today = dayjs().format("YYYY-MM-DD");
  const q: TimesheetQuery = {
    start: sp.get("start_date") || dayjs().subtract(6, "day").format("YYYY-MM-DD"),
    end: sp.get("end_date") || today,
    tz: sp.get("timezone_str") || "America/New_York",
    offset: Math.max(0, Number(sp.get("offset") ?? 0) || 0),
    limit: Math.max(1, Math.min(400, Number(sp.get("limit") ?? 10) || 10)),
    projectId: sp.get("project_id"),
    timeType: sp.get("time_type"),
    activityLevel: sp.get("activity_level"),
  };
  const exportType = sp.get("export_type");
  if (exportType) {
    const { rows, data } = exportRows(getCtx(req), user, q);
    const base = `timesheet-${q.start}-to-${q.end}`;
    if (exportType === "pdf") {
      const lines = rows.map((r) => r.map(String).join("  |  "));
      return new NextResponse(toPdf(`Timesheet — ${data.user.name} (${q.start} to ${q.end}, ${q.tz})`, lines), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${base}.pdf"` },
      });
    }
    return new NextResponse(toCsvText(rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.csv"` },
    });
  }
  return respond(req, (ctx) => userTimesheet(ctx, user, q));
}
