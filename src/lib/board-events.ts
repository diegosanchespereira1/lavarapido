"use client";

import { DEV_AUTH_STORAGE_KEY } from "@/lib/api";
import { resolveApiBase } from "@/lib/api-base";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEV_AUTH_STORAGE_KEY);
}

/** Eventos SSE que disparam recarregamento do quadro (ignora snapshot inicial). */
const REFRESH_EVENTS = new Set(["evento"]);

type StreamOpts = {
  branchId: string;
  onRefresh: () => void;
  signal: AbortSignal;
};

/**
 * Conecta ao stream SSE da filial (Redis pub/sub na API).
 * Usa fetch para enviar Authorization + X-Branch-Id (EventSource nativo não suporta headers).
 */
export async function consumeBoardEventStream({
  branchId,
  onRefresh,
  signal,
}: StreamOpts): Promise<void> {
  const token = getToken();
  if (!token) return;

  const res = await fetch(`${resolveApiBase()}/v1/events/stream`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
      "X-Branch-Id": branchId,
    },
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`SSE ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      if (!block.trim()) continue;
      let eventName = "message";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        }
      }
      if (eventName === "heartbeat") continue;
      if (REFRESH_EVENTS.has(eventName)) {
        onRefresh();
      }
    }
  }
}

const RECONNECT_MS = [1000, 2000, 5000, 10_000];

/** Mantém conexão SSE com reconexão automática. */
export function connectBoardEventStream(
  branchId: string,
  onRefresh: () => void,
): () => void {
  const controller = new AbortController();
  let attempt = 0;
  let closed = false;

  const debounced = debounce(onRefresh, 250);

  async function loop() {
    while (!closed && !controller.signal.aborted) {
      try {
        await consumeBoardEventStream({
          branchId,
          onRefresh: debounced,
          signal: controller.signal,
        });
        attempt = 0;
      } catch {
        if (closed || controller.signal.aborted) break;
        const delay =
          RECONNECT_MS[Math.min(attempt, RECONNECT_MS.length - 1)]!;
        attempt += 1;
        await sleep(delay, controller.signal);
      }
    }
  }

  void loop();

  return () => {
    closed = true;
    controller.abort();
    debounced.cancel();
  };
}

function debounce(fn: () => void, ms: number) {
  let id: ReturnType<typeof setTimeout> | null = null;
  const wrapped = () => {
    if (id) clearTimeout(id);
    id = setTimeout(() => {
      id = null;
      fn();
    }, ms);
  };
  wrapped.cancel = () => {
    if (id) clearTimeout(id);
    id = null;
  };
  return wrapped;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
