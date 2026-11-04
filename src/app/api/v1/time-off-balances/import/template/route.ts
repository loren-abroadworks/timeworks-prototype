import { NextResponse } from "next/server";

/** GET /api/v1/time-off-balances/import/template?organization_id= — CSV template. */
export async function GET() {
  return new NextResponse("email,policy_name,new_balance_hours,reason\njordan.avery@acme-remote.example,Vacation Leave,40,Opening balance\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="timeoff-balances-template.csv"' },
  });
}
