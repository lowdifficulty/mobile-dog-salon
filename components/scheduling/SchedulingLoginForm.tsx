"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SchedulingShell from "./SchedulingShell";

export default function SchedulingLoginForm({
  role,
  title,
  subtitle,
  dashboardPath,
}: {
  role: "groomer" | "admin";
  title: string;
  subtitle: string;
  loginPath: string;
  dashboardPath: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("melanie");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        username: role === "groomer" ? username : undefined,
        email: role === "admin" ? email : undefined,
        password,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed");
      return;
    }

    router.push(dashboardPath);
    router.refresh();
  }

  return (
    <SchedulingShell title={title}>
      <div className="max-w-md mx-auto site-card p-8">
        <h1 className="site-heading-section text-2xl mb-2">{title}</h1>
        <p className="text-gray-600 text-sm mb-6">{subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === "groomer" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Groomer</label>
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white"
              >
                <option value="melanie">Melanie</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
              />
            </div>
          )}

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
      </div>
    </SchedulingShell>
  );
}
