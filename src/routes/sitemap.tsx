import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap")({
  head: () => ({
    meta: [
      { title: "Sitemap — Batman" },
      { name: "description", content: "Daftar semua halaman yang terdaftar di aplikasi." },
    ],
  }),
  component: SitemapPage,
});

type Entry = { path: string; name: string; note?: string };
type Group = { title: string; description?: string; entries: Entry[] };

const groups: Group[] = [
  {
    title: "Public",
    entries: [
      { path: "/", name: "Home", note: "Redirect ke onboarding jika sudah login" },
      { path: "/login", name: "Login" },
      { path: "/register", name: "Register" },
      { path: "/forgot-password", name: "Forgot Password" },
      { path: "/reset-password", name: "Reset Password" },
      { path: "/change-password", name: "Ubah Password" },
      { path: "/sitemap", name: "Sitemap" },
    ],
  },
  {
    title: "Dashboard",
    description: "Investor home setelah login. Sub-route di-render di dalam layout /dashboard.",
    entries: [
      { path: "/dashboard", name: "Dashboard Home" },
      { path: "/dashboard/strategies", name: "Browse Strategies" },
      { path: "/dashboard/portfolio", name: "Portfolio" },
      { path: "/dashboard/learn", name: "Learn" },
      { path: "/dashboard/saved-strategies", name: "Saved Strategies" },
      { path: "/dashboard/account", name: "Account" },
      { path: "/dashboard/not-connected", name: "State — Not Connected" },
      { path: "/dashboard/need-verify", name: "State — Need Verify" },
      { path: "/dashboard/need-following", name: "State — Need Following" },
      { path: "/dashboard/followed", name: "State — Followed" },
    ],
  },
  {
    title: "Strategies",
    entries: [
      { path: "/strategies/$username", name: "Money Manager Detail" },
      { path: "/strategies/$strategyId/$step", name: "Follow Strategy Flow", note: "step-1, step-2, dst." },
    ],
  },
  {
    title: "Onboarding",
    description: "Flow popup setelah login",
    entries: [
      { path: "/onboarding/select", name: "Pilih Platform" },
      { path: "/onboarding/create", name: "Create Account" },
      { path: "/onboarding/creating", name: "Loading Creating" },
      { path: "/onboarding/created", name: "Account Created" },
      { path: "/onboarding/binding", name: "Binding Permissions" },
      { path: "/onboarding/binding-loading", name: "Binding Loading" },
      { path: "/onboarding/binding-success", name: "Binding Success" },
      { path: "/onboarding/binding-failed", name: "Binding Failed" },
      { path: "/onboarding/verifying-document", name: "Verifying Document" },
    ],
  },
  {
    title: "PCX SSO",
    description: "Halaman SSO untuk PCX",
    entries: [
      { path: "/pcxfx/registration", name: "SSO Registration" },
      { path: "/pcxfx/login", name: "SSO Login" },
    ],
  },
  {
    title: "Unfollow",
    description: "Popup modal flow untuk stop following strategy",
    entries: [
      { path: "/unfollow/confirmation", name: "Confirmation", note: "Konfirmasi stop following" },
      { path: "/unfollow/loading", name: "Loading", note: "Progress closing positions & settling fee" },
      { path: "/unfollow/success", name: "Success", note: "Strategy following stopped" },
      { path: "/unfollow/failed", name: "Failed", note: "Gagal stop following, ada open position" },
      { path: "/unfollow/information", name: "Information", note: "Stopped tapi settlement pending" },
    ],
  },
];

function isDynamic(path: string) {
  return path.includes("$");
}

function SitemapPage() {
  const total = groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-blue-600 mb-2">SITEMAP</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Daftar Halaman</h1>
          <p className="text-sm text-gray-500">{total} route terdaftar di aplikasi ini.</p>
        </header>

        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.title} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">{g.title}</h2>
                {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
              </div>
              <ul className="divide-y divide-gray-100">
                {g.entries.map((e) => {
                  const dynamic = isDynamic(e.path);
                  return (
                    <li key={e.path} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
                        {e.note && <p className="text-xs text-gray-500 mt-0.5">{e.note}</p>}
                      </div>
                      {dynamic ? (
                        <code className="text-xs font-mono text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md whitespace-nowrap">
                          {e.path}
                        </code>
                      ) : (
                        <Link
                          to={e.path}
                          className="text-xs font-mono text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors"
                        >
                          {e.path}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          Halaman dinamis (mengandung <code className="font-mono">$param</code>) tidak bisa dibuka langsung.
        </p>
      </div>
    </div>
  );
}
