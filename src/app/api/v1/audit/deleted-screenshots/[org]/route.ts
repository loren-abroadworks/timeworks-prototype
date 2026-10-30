import { NextResponse, type NextRequest } from "next/server";
import { getCtx, respond } from "@/mock/http";
import { deletedScreenshots, filterDeleted, type DeletedQuery } from "@/mock/screenshots";

function queryOf(req: NextRequest): DeletedQuery {
  const sp = req.nextUrl.searchParams;
  return {
    page: Number(sp.get("page") ?? 1) || 1,
    pageSize: Number(sp.get("page_size") ?? 10) || 10,
    memberId: sp.get("member_id") || sp.get("user_id"),
    projectId: sp.get("project_id"),
    startDate: sp.get("start_date"),
    endDate: sp.get("end_date"),
    deletionType: sp.get("deletion_type") || sp.get("delete_type"),
    timezone: sp.get("timezone"),
  };
}

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * GET /api/v1/audit/deleted-screenshots/{org}?page&page_size&member_id&project_id&start_date&end_date&deletion_type&timezone
 * With `export=excel` it returns a CSV file (the live app returns .xlsx — the replica generates CSV locally).
 */
export async function GET(req: NextRequest) {
  const q = queryOf(req);
  if (req.nextUrl.searchParams.get("export")) {
    const { rows } = filterDeleted(getCtx(req), q);
    const header = ["Member", "Project", "Task", "Started At", "Stopped At", "Duration (min)", "Deleted By", "Deleted Type", "Deleted At", "Expires", "Reason"];
    const lines = rows.map((r) =>
      [r.member_name, r.project_name, r.task_name, r.started_at, r.stopped_at, Math.round(r.duration_seconds / 60), r.deleted_by_name, r.deletion_type, r.deleted_at, r.expiration_date, r.delete_reason]
        .map(cell)
        .join(","),
    );
    return new NextResponse([header.join(","), ...lines].join("\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="deleted-screenshots.csv"` },
    });
  }
  return respond(req, (ctx) => deletedScreenshots(ctx, q));
}
