/**
 * Tiny path matcher. Compiles a pattern like "/users/money-managers/:username"
 * into a regex and, on match, returns the extracted params.
 */
export interface CompiledRoute {
  regex: RegExp;
  keys: string[];
}

export function compile(pattern: string): CompiledRoute {
  const keys: string[] = [];
  const regexStr = pattern
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":")) {
        keys.push(seg.slice(1));
        return "([^/]+)";
      }
      // escape regex metacharacters in literal segments
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${regexStr}/?$`), keys };
}

export function matchPath(
  compiled: CompiledRoute,
  path: string,
): Record<string, string> | null {
  const m = compiled.regex.exec(path);
  if (!m) return null;
  const params: Record<string, string> = {};
  compiled.keys.forEach((key, i) => {
    params[key] = decodeURIComponent(m[i + 1]);
  });
  return params;
}
