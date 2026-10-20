import type { RelKey } from "./data";

export interface SharePayload {
  r: RelKey;
  a: number[];
}

export function encodeState(p: SharePayload): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  } catch {
    return "";
  }
}

export function decodeState(s: string): SharePayload | null {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(s))));
    if (
      obj &&
      typeof obj.r === "string" &&
      ["me", "vo", "chi", "ba", "codi"].includes(obj.r) &&
      Array.isArray(obj.a) &&
      obj.a.every((n: unknown) => typeof n === "number" && Number.isFinite(n))
    ) {
      return obj as SharePayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function readHash(): SharePayload | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash;
  const m = h.match(/#d=([A-Za-z0-9+/=]+)/);
  if (!m) return null;
  return decodeState(m[1]);
}
