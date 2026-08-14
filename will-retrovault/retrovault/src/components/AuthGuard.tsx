"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type AuthState = "loading" | "authenticated" | "unauthenticated";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't guard the login page or public share pages
    if (pathname === "/login" || pathname.startsWith("/public/")) {
      setAuthState("authenticated");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      // Fail open after 3s timeout
      setAuthState("authenticated");
    }, 3000);

    fetch("/api/auth", { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        clearTimeout(timeout);
        if (d.authenticated) {
          setAuthState("authenticated");
        } else {
          setAuthState("unauthenticated");
          router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        // Fail open on network error (LAN-first design)
        setAuthState("authenticated");
      });

    return () => { clearTimeout(timeout); controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // router excluded — stable ref not needed for auth check

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="font-terminal text-green-500 text-2xl animate-pulse">
          AUTHENTICATING...
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return null; // Redirecting
  }

  return <>{children}</>;
}

// Hook to logout from anywhere in the app
export function useLogout() {
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    // Clear the session cookie client-side too
    document.cookie = "rv-session=; max-age=0; path=/";
    router.push("/login");
  };
  return logout;
}
