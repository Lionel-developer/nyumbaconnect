"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

function parseExpiresInToMs(expiresIn) {
  if (!expiresIn) return 30 * 24 * 60 * 60 * 1000;
  if (typeof expiresIn === "number") return expiresIn * 1000;

  const s = String(expiresIn).trim();
  const match = s.match(/^(\d+)\s*([smhd])?$/i);
  if (!match) return 30 * 24 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  const multipliers = { s: 1000, m: 60e3, h: 3600e3, d: 86400e3 };

  return value * (multipliers[unit] || 1000);
}

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userType, setUserType] = useState("tenant"); // tenant | landlord | agent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setBusy(true);

      const res = await api.post("/api/auth/register", {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        userType,
        email: email.trim(),
        password,
      });

      const payload = res.data?.data || {};
      const token = payload.token;
      const user = payload.user;
      const expiresIn = payload.expiresIn;

      if (!token || !user) {
        throw new Error("Unexpected register response");
      }

      const expiresAt = Date.now() + parseExpiresInToMs(expiresIn);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("expiresAt", String(expiresAt));

      router.push("/");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Register failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-xl sm:text-2xl font-semibold">Register</h1>
        <p className="mt-1 text-sm opacity-80">
          Create your NyumbaConnect account.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-2xl bg-[var(--taupe-300)] p-4 sm:p-5"
        >
          {error && (
            <div className="mb-3 rounded-2xl bg-white/60 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium">Full name</label>
          <input
            className="mt-1 w-full rounded-2xl bg-white px-4 py-3 outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Lionel Mwangi"
            autoComplete="name"
            required
          />

          <label className="mt-4 block text-sm font-medium">Phone number</label>
          <input
            className="mt-1 w-full rounded-2xl bg-white px-4 py-3 outline-none"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 07xx xxx xxx"
            inputMode="tel"
            autoComplete="tel"
            required
          />

          <label className="mt-4 block text-sm font-medium">User type</label>
          <select
            className="mt-1 w-full rounded-2xl bg-white px-4 py-3 outline-none"
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
          >
            <option value="tenant">Tenant</option>
            <option value="landlord">Landlord</option>
            <option value="agent">Agent</option>
          </select>

          <label className="mt-4 block text-sm font-medium">Email</label>
          <input
            className="mt-1 w-full rounded-2xl bg-white px-4 py-3 outline-none"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            required
          />

          <label className="mt-4 block text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded-2xl bg-white px-4 py-3 outline-none"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-2xl bg-white px-4 py-3 font-semibold shadow-sm disabled:opacity-60"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>

          <p className="mt-4 text-sm">
            Already have an account?{" "}
            <Link className="underline" href="/login">
              Login
            </Link>
          </p>
        </form>

        <button className="mt-4 underline text-sm" onClick={() => router.push("/")}>
          ← Back to listings
        </button>
      </div>
    </main>
  );
}