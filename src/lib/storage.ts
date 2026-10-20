import type { RelKey } from "./data";

const KEY = "hdvh_v1";

export interface SavedState {
  rel: RelKey;
  raws: number[];
  done: boolean;
  at: number;
}

export function saveState(st: SavedState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
  } catch {
    /* noop */
  }
}

export function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (
      o &&
      typeof o.rel === "string" &&
      Array.isArray(o.raws) &&
      typeof o.at === "number" &&
      Date.now() - o.at < 1000 * 60 * 60 * 24 * 30 // còn hạn 30 ngày
    ) {
      return o as SavedState;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/* ---------- nhắc hành động: đánh dấu việc đã làm ---------- */

const TODO_KEY = "hdvh_todo_v1";

export function loadTodos(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(TODO_KEY) || "{}");
  } catch {
    return {};
  }
}

export function toggleTodo(id: string): Record<string, boolean> {
  const t = loadTodos();
  t[id] = !t[id];
  try {
    localStorage.setItem(TODO_KEY, JSON.stringify(t));
  } catch {
    /* noop */
  }
  return t;
}
