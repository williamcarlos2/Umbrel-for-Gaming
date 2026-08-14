"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  // If auth is disabled, auto-redirect
  useEffect(() => {
    fetch("/api/auth").then(r => r.json()).then(d => {
      if (d.authenticated) router.replace(from);
    });
  }, [from, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await res.json();
      if (d.ok) {
        router.replace(from);
      } else {
        setError(d.error || "Incorrect password.");
        setPassword("");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        zIndex: 1,
      }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">👾</div>
          <h1 className="font-terminal text-4xl text-green-400 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] mb-2">
            RetroVault
          </h1>
          <p className="font-terminal text-green-700 text-sm">ACCESS RESTRICTED</p>
        </div>

        {/* Login panel */}
        <div className="bg-zinc-950 border-4 border-green-800 shadow-[0_0_30px_rgba(34,197,94,0.2)] p-8">
          <div className="border-b-2 border-green-900 mb-6 pb-3">
            <p className="font-terminal text-green-600 text-sm uppercase tracking-widest">
              &gt; AUTHENTICATE TO CONTINUE
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-terminal text-green-700 text-sm uppercase mb-2">
                Password
              </label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black border-2 border-green-900 text-green-300 font-terminal text-2xl p-3 focus:outline-none focus:border-green-500 placeholder-green-900 tracking-widest"
              />
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-700 p-3">
                <p className="font-terminal text-red-400 text-sm">⚠ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-black font-terminal text-2xl font-bold uppercase tracking-widest transition-colors disabled:opacity-40 border-2 border-green-400 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(34,197,94,0.3)]"
            >
              {loading ? "VERIFYING..." : "ENTER VAULT"}
            </button>
          </form>

          <p className="text-zinc-700 font-terminal text-xs mt-6 text-center">
            Authentication set via Settings → Authentication
          </p>
        </div>

        {/* Blink cursor */}
        <div className="text-center mt-4">
          <span className="font-terminal text-green-800 text-sm animate-pulse">█</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="font-terminal text-green-500 text-2xl animate-pulse">LOADING...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
