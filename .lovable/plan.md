# Unfollow Modal Routes

Add 5 new routes that each render a centered popup modal over a dimmed backdrop, matching the existing modal convention used in `strategies.$username.$step.tsx` (`fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4`).

## Routes

| File | URL | Modal |
|---|---|---|
| `src/routes/unfollow.confirmation.tsx` | `/unfollow/confirmation` | Gambar 1 — "Stop following this strategy?" |
| `src/routes/unfollow.loading.tsx` | `/unfollow/loading` | Gambar 2 — "Stopping strategy following" w/ step list |
| `src/routes/unfollow.success.tsx` | `/unfollow/success` | Gambar 3 — "Strategy following stopped" summary |
| `src/routes/unfollow.failed.tsx` | `/unfollow/failed` | Gambar 4 — "We couldn't stop following yet" |
| `src/routes/unfollow.information.tsx` | `/unfollow/information` | Gambar 5 — "Strategy following was stopped" (settlement pending) |

## Shared modal shell

- Backdrop: `fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4` (same as existing step modals).
- Card: white rounded-2xl, max-w ~480px, generous padding, soft shadow.
- Dismiss: clicking backdrop or close icon (where shown in design) navigates to `/dashboard/portfolio`.
- Each route uses `head()` with a unique title + description.

## Per-modal content (built 1:1 from uploaded images)

1. **Confirmation** — blue alert-triangle icon, title, body, strategy card (AK avatar / Consistent Strategy / Account #123456 • Managed by Alex K.), light-blue info box, `Cancel` (outline) → back, `Stop Following` (primary) → `/unfollow/loading`.
2. **Loading** — top circular timer icon, close (X) top-right → dashboard, title, body, vertical step list with states: done (green check), active (blue ring), pending (gray). Active step bold.
3. **Success** — green check badge, title, body, summary table (Strategy / Account / Open positions=Closed green / Strategy fee=Applied / Account status=Available green), `View Portfolio` (outline) → `/dashboard/portfolio`, `Explore Strategies` (primary) → `/dashboard/strategies`.
4. **Failed** — amber alert-triangle icon, title, body, amber warning box, `Cancel` (outline) → dashboard, `Try Again` (primary) → `/unfollow/loading`.
5. **Information** — blue clock icon, title, body, summary table (…Strategy fee=Settlement pending, Account status=Updating…), blue info notice, full-width `View Portfolio` primary → `/dashboard/portfolio`.

## Sitemap

Add new "Unfollow" group with the 5 routes to both `src/routes/sitemap.tsx` (visual) and `src/routes/sitemap.xml.ts` (XML).

## Out of scope

No backend wiring, no real state machine — these are static UI states triggered by entering the URL or by buttons linking between them.
