/**
 * Saved filters (Filters popover › "Saved filters" tab). Stored per page_key, in memory.
 * Live endpoints: GET/POST /saved-filters/{org}?page_key=…, PUT/DELETE /saved-filters/{org}/{id}, PUT /saved-filters/{org}/reorder
 */
import { ApiError } from "./http";
import { runtimeId } from "./random";
import { getStore, type SavedFilter } from "./store";

export function listSavedFilters(pageKey: string) {
  const data = getStore()
    .savedFilters.filter((f) => f.page_key === pageKey)
    .sort((a, b) => a.position - b.position);
  return { success: true, data };
}

function parse(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  if (!name) throw new ApiError(422, "Name is required");
  const filters = (body.filters && typeof body.filters === "object" ? body.filters : {}) as SavedFilter["filters"];
  return { name, description: String(body.description ?? ""), filters, page_key: String(body.page_key ?? "") };
}

export function createSavedFilter(body: Record<string, unknown>) {
  const p = parse(body);
  if (!p.page_key) throw new ApiError(422, "page_key is required");
  const store = getStore();
  const f: SavedFilter = { id: runtimeId("sf"), ...p, position: store.savedFilters.filter((x) => x.page_key === p.page_key).length, created_at: new Date().toISOString() };
  store.savedFilters.push(f);
  return { success: true, data: f };
}

export function updateSavedFilter(id: string, body: Record<string, unknown>) {
  const f = getStore().savedFilters.find((x) => x.id === id);
  if (!f) throw new ApiError(404, "Saved filter not found");
  const p = parse({ page_key: f.page_key, ...body });
  Object.assign(f, { name: p.name, description: p.description, filters: p.filters });
  return { success: true, data: f };
}

export function deleteSavedFilter(id: string) {
  const store = getStore();
  const i = store.savedFilters.findIndex((x) => x.id === id);
  if (i < 0) throw new ApiError(404, "Saved filter not found");
  store.savedFilters.splice(i, 1);
  return { success: true };
}

export function reorderSavedFilters(body: unknown) {
  const items = Array.isArray(body) ? body : Array.isArray((body as { items?: unknown })?.items) ? (body as { items: unknown[] }).items : [];
  for (const it of items as { id: string; position: number }[]) {
    const f = getStore().savedFilters.find((x) => x.id === it.id);
    if (f) f.position = Number(it.position) || 0;
  }
  return { success: true };
}
