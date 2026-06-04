/**
 * Mock dispatcher. `apiRequest()` in src/lib/api.ts short-circuits here when
 * VITE_USE_MOCKS is on. We match the request against the route table, simulate
 * latency, and return the same `JSONResponse<T>` envelope the real API returns.
 *
 * 401 is never produced, so the global SessionExpiredModal never fires
 * spuriously. An unmatched route throws a loud ApiError(404, "No mock …") so any
 * uncovered endpoint surfaces during testing instead of failing silently.
 */
import { ApiError, type ApiRequestOptions, type JSONResponse, type MetaData } from "@/lib/api";
import { compile, matchPath, type CompiledRoute } from "./match";
import { randomLatency } from "./latency";
import { routes } from "./handlers";

interface Compiled {
  method: string;
  compiled: CompiledRoute;
  handler: (typeof routes)[number]["handler"];
}

const compiledRoutes: Compiled[] = routes.map((r) => ({
  method: r.method.toUpperCase(),
  compiled: compile(r.path),
  handler: r.handler,
}));

function normalizePath(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  // strip any querystring that slipped into the path
  const qIndex = withSlash.indexOf("?");
  return qIndex === -1 ? withSlash : withSlash.slice(0, qIndex);
}

export async function handleMock<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<JSONResponse<T>> {
  const method = (options.method ?? "GET").toUpperCase();
  const cleanPath = normalizePath(path);

  await randomLatency();

  for (const route of compiledRoutes) {
    if (route.method !== method) continue;
    const params = matchPath(route.compiled, cleanPath);
    if (!params) continue;

    const result = route.handler({
      params,
      query: options.query as Record<string, unknown> | undefined,
      body: options.body,
    });

    const envelope: JSONResponse<T> & { meta?: MetaData } = {
      data: result.data as T,
      success: true,
    };
    if (result.meta) envelope.meta = result.meta;
    return envelope;
  }

  throw new ApiError(404, `No mock for ${method} ${cleanPath}`);
}
