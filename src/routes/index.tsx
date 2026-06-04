import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      setLoading(false);
      if (newUser) {
        navigate({ to: "/onboarding/$step", params: { step: "select" }, replace: true });
      }
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (data.user) {
        navigate({ to: "/onboarding/$step", params: { step: "select" }, replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#2563EB" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Shield className="w-10 h-10" style={{ color: "#2563EB" }} />
            <span className="text-3xl font-bold text-gray-900">BATMAN</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Batman</h1>
          <p className="text-gray-500 mb-8">Choose a strategy. Let the experts do the rest.</p>
          <div className="flex gap-4 justify-center">
            <Link to="/login" className="px-6 py-3 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: "#2563EB" }}>
              Login
            </Link>
            <Link to="/register" className="px-6 py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Shield className="w-10 h-10" style={{ color: "#2563EB" }} />
          <span className="text-3xl font-bold text-gray-900">BATMAN</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome, {user.user_metadata?.full_name || user.email}
        </h1>
        <p className="text-gray-500 mb-8">You're signed in successfully.</p>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
