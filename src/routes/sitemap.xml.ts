import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { popularStrategies } from "@/data/popularStrategies";

const BASE_URL = "https://batman-dev.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap/xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/login", changefreq: "monthly", priority: "0.5" },
          { path: "/register", changefreq: "monthly", priority: "0.5" },
          { path: "/forgot-password", changefreq: "monthly", priority: "0.3" },
          { path: "/reset-password", changefreq: "monthly", priority: "0.3" },
          { path: "/change-password", changefreq: "monthly", priority: "0.3" },
          { path: "/dashboard", changefreq: "weekly", priority: "0.8" },
          { path: "/dashboard/not-connected", changefreq: "monthly", priority: "0.5" },
          { path: "/dashboard/need-verify", changefreq: "monthly", priority: "0.5" },
          { path: "/dashboard/need-following", changefreq: "monthly", priority: "0.5" },
          { path: "/dashboard/followed", changefreq: "weekly", priority: "0.8" },
          { path: "/dashboard/strategies", changefreq: "daily", priority: "0.9" },
          { path: "/dashboard/portfolio", changefreq: "weekly", priority: "0.7" },
          { path: "/dashboard/learn", changefreq: "weekly", priority: "0.7" },
          { path: "/dashboard/saved-strategies", changefreq: "weekly", priority: "0.6" },
          { path: "/dashboard/account", changefreq: "monthly", priority: "0.4" },
          { path: "/strategies", changefreq: "daily", priority: "0.9" },
          { path: "/pcxfx/login", changefreq: "monthly", priority: "0.5" },
          { path: "/pcxfx/registration", changefreq: "monthly", priority: "0.5" },
          { path: "/unfollow/confirmation", changefreq: "monthly", priority: "0.3" },
          { path: "/unfollow/loading", changefreq: "monthly", priority: "0.2" },
          { path: "/unfollow/success", changefreq: "monthly", priority: "0.3" },
          { path: "/unfollow/failed", changefreq: "monthly", priority: "0.2" },
          { path: "/unfollow/information", changefreq: "monthly", priority: "0.3" },
        ];

        // Dynamic strategy detail pages
        for (const s of popularStrategies) {
          entries.push({
            path: `/strategies/${s.id}`,
            changefreq: "daily",
            priority: "0.7",
          });
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
