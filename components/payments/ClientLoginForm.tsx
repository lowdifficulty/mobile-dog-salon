"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClientPortalShell from "./ClientPortalShell";

export default function ClientLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/client/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed");
      return;
    }

    router.push("/client/portal");
    router.refresh();
  }

  return (
    <ClientPortalShell title="Client portal">
      <div className="site-card p-8">
        <h1 className="site-heading-section text-2xl mb-2">Sign in</h1>
        <p className="text-gray-600 text-sm mb-6">
          Manage appointments, upload pet photos, pay online, and chat with Licky.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email or phone
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              placeholder="you@email.com or (555) 555-5555"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="site-btn w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          New client?{" "}
          <Link href="/client/register" className="site-link">Create an account</Link>
        </p>
      </div>
    </ClientPortalShell>
  );
}
