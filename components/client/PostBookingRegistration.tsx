"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LICKY_AVATAR } from "@/lib/client/portal";

interface PostBookingRegistrationProps {
  appointmentId: string;
  phone: string;
  firstName: string;
  lastName: string;
  onComplete?: () => void;
}

export default function PostBookingRegistration({
  appointmentId,
  phone,
  firstName,
  lastName,
  onComplete,
}: PostBookingRegistrationProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/client/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        firstName: first,
        lastName: last,
        phone,
        appointmentId,
        lockInDiscount: true,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed");
      return;
    }

    onComplete?.();
    router.push("/client/portal?welcome=1");
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto mt-6 text-left">
      <div className="rounded-2xl border-2 border-brand/30 bg-gradient-to-b from-brand/5 to-white p-5 space-y-4">
        <div className="flex items-start gap-3">
          <img
            src={LICKY_AVATAR}
            alt="Licky the Chihuahua"
            className="w-14 h-14 rounded-full border-2 border-brand/20 object-cover bg-amber-50"
          />
          <div>
            <p className="text-sm font-bold text-brand">Lock in your 50% discount forever</p>
            <p className="text-sm text-gray-600 mt-1">
              Complete registration to keep your grooming discount on every visit.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                First name
              </label>
              <input
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Last name
              </label>
              <input
                value={last}
                onChange={(e) => setLast(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              readOnly
              className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-5 py-3 bg-brand text-white text-sm font-semibold rounded-full hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Lock in my discount"}
          </button>
        </form>
      </div>
    </div>
  );
}
