import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { deleteSlots } from "@/mock/screenshots";
import { MEMBERS } from "@/mock/seed";

type Params = { params: Promise<{ org: string; user: string }> };

/**
 * DELETE /api/v1/delete/screenshot-slot/{org}/{user}
 * body { local_activity_duration_id: string[], delete_reason?: string }  (ids = the slots' local_activity_duration_ids)
 * Removes the slots' time from the member's entries and soft-deletes their screenshots.
 */
async function handle(req: NextRequest, { params }: Params) {
  const { user } = await params;
  return respondWrite(req, (_ctx, body) => {
    const raw = body.local_activity_duration_id ?? body.local_activity_duration_ids ?? [];
    const ids = (Array.isArray(raw) ? raw : String(raw).split(",")).map(String);
    const deleted = deleteSlots(user, ids, String(body.delete_reason ?? ""), MEMBERS[0].full_name);
    return { status: "success", message: "Slots deleted successfully", deleted_slots: deleted };
  });
}

export const DELETE = handle;
/** POST alias (same body) for clients that cannot send a DELETE body. */
export const POST = handle;
