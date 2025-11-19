import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from query key
    // If queryKey has multiple parts, treat first as base URL and rest as query params
    let url: string;
    if (queryKey.length === 1) {
      url = queryKey[0] as string;
    } else {
      const [baseUrl, ...params] = queryKey;
      const searchParams = new URLSearchParams();
      
      // Handle different parameter formats
      if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null) {
        // Object format: { sport: 'NHL', status: 'active' }
        Object.entries(params[0]).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      } else {
        // Simple format: ['/api/props', 'NHL'] → /api/props?sport=NHL
        // Assume second param is the value for a default key
        if (baseUrl === '/api/props' && params[0]) {
          searchParams.set('sport', String(params[0]));
        }
      }
      
      url = searchParams.toString() 
        ? `${baseUrl}?${searchParams.toString()}` 
        : baseUrl as string;
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
