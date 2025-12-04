import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  options: {
    method: string;
    url: string;
    data?: unknown | undefined;
    on401?: "returnNull" | "throw";
  }
): Promise<Response> {
  const { method, url, data } = options;
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return res;
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await apiRequest({
      method: "GET",
      url: queryKey[0] as string,
      on401: unauthorizedBehavior
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
      retry: (failureCount, error: any) => {
        // Don't retry on 401, 403, or 502 errors
        if (error?.message?.includes('401') || error?.message?.includes('403') || error?.message?.includes('502')) {
          return false;
        }
        // Retry up to 1 time for other errors
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
    mutations: {
      retry: false,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});
