import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { deleteSavedFilter, updateSavedFilter } from "@/mock/saved-filters";

type Params = { params: Promise<{ org: string; id: string }> };

/** PUT /api/v1/saved-filters/{org}/{id} — body { page_key, name, description, filters }. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondWrite(req, (_ctx, body) => updateSavedFilter(id, body));
}

/** DELETE /api/v1/saved-filters/{org}/{id} */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondWrite(req, () => deleteSavedFilter(id));
}
