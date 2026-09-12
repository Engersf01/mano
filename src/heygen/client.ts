"use client";
/** Typed fetch helpers for the `/api/heygen/*` routes. */
import type {
  AvatarContext,
  AvatarSummary,
  ContextDraft,
  ContextSummary,
  SessionGrant,
  SessionRequest,
  VoiceSummary,
} from "./types";

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const message = (json as { error?: string }).error;
    throw new Error(message || `Request failed (HTTP ${res.status}).`);
  }
  return json as T;
}

export async function fetchApiStatus() {
  return call<{ configured: boolean }>("/api/heygen/status");
}

export async function fetchAvatars() {
  const { avatars } = await call<{ avatars: AvatarSummary[] }>("/api/heygen/avatars");
  return avatars;
}

export async function fetchVoices() {
  const { voices } = await call<{ voices: VoiceSummary[] }>("/api/heygen/voices");
  return voices;
}

export async function fetchContexts() {
  const { contexts } = await call<{ contexts: ContextSummary[] }>("/api/heygen/contexts");
  return contexts;
}

export async function fetchContext(id: string) {
  const { context } = await call<{ context: AvatarContext }>(
    `/api/heygen/contexts/${encodeURIComponent(id)}`,
  );
  return context;
}

export async function createContext(draft: ContextDraft) {
  const { context } = await call<{ context: AvatarContext }>("/api/heygen/contexts", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  return context;
}

export async function updateContext(id: string, draft: ContextDraft) {
  const { context } = await call<{ context: AvatarContext }>(
    `/api/heygen/contexts/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(draft) },
  );
  return context;
}

export async function deleteContext(id: string) {
  await call<{ deleted: string }>(`/api/heygen/contexts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createSessionToken(request: SessionRequest) {
  return call<SessionGrant>("/api/heygen/session", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchDisplayUrl(room: string) {
  return call<{
    path: string;
    origin: string;
    candidates: string[];
    secure: boolean;
  }>(`/api/avatar/display-url?room=${encodeURIComponent(room)}`);
}
