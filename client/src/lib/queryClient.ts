import { QueryClient } from "@tanstack/react-query";

// Support both local dev (relative /api) and deployed (proxied via __PORT_5000__)
export const API_BASE =
  typeof window !== "undefined" && (window as unknown as Record<string, string>).__PORT_5000__
    ? `${(window as unknown as Record<string, string>).__PORT_5000__}`
    : "";

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorMsg = `${res.status} ${res.statusText}`;
    try {
      const errData = await res.json();
      errorMsg = errData.error || errorMsg;
    } catch { /* ignore */ }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const [path] = queryKey as [string, ...unknown[]];
        return apiRequest("GET", path);
      },
      staleTime: 30_000,
      retry: false,
    },
  },
});
