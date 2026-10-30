"use client";

import { useMutation, useQuery, type QueryKey } from "@tanstack/react-query";

/** All API calls go to the built-in mock (Next route handlers under src/app/api/v1). */
export const API_BASE = "/api/v1";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function parse<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const msg = (json as { message?: string; detail?: string } | null)?.detail ?? (json as { message?: string } | null)?.message ?? `${label} failed: ${res.status}`;
    throw new ApiRequestError(res.status, msg, json);
  }
  return json as T;
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const res = await fetch(`${API_BASE}${path}`, { credentials: "same-origin" });
  return parse<T>(res, `GET ${path}`);
}

export type HttpMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/** Write request with a JSON body (the live axios client also sends bodies on DELETE). */
export async function apiSend<T>(method: HttpMethod, endpoint: string, body?: unknown): Promise<T> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parse<T>(res, `${method} ${path}`);
}

/** Same signature as the live app's `useFetch({ endpoint, queryKey, enabled })` hook. */
export function useApiQuery<T>({ endpoint, queryKey, enabled = true }: { endpoint: string; queryKey: QueryKey; enabled?: boolean }) {
  return useQuery<T>({ queryKey, queryFn: () => apiGet<T>(endpoint), enabled });
}

/**
 * Mutation hook mirroring the live app's R.Z (POST) / R.Y (PUT) / R.J (DELETE) / R.C (PATCH) hooks:
 * `const { mutateAsync } = useApiMutation("PUT")` then `mutateAsync({ endpoint, body })`.
 */
export function useApiMutation<T = unknown>(method: HttpMethod, options: { onSuccess?: (data: T) => void; onError?: (err: Error) => void } = {}) {
  return useMutation<T, Error, { endpoint: string; body?: unknown }>({
    mutationFn: ({ endpoint, body }) => apiSend<T>(method, endpoint, body),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
