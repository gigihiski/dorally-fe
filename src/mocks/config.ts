/**
 * Frontend-only demo mode flag.
 *
 * When ON (the default for dorally-fe), every backend call made through
 * `apiRequest()` is short-circuited to the in-memory mock layer in this folder
 * — no network requests reach the real API, Supabase, Google or PCX.
 *
 * Flip it off by setting `VITE_USE_MOCKS="false"` in `.env` to restore the
 * original `fetch`-based behaviour verbatim.
 */
export const USE_MOCKS: boolean = import.meta.env.VITE_USE_MOCKS !== "false";
