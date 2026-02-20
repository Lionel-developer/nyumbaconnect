"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../lib/api"; // if api is in app/lib/api.js

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setBusy(true);

      const res = await api.post("/api/auth/login", {
        phoneNumber: phoneNumber.trim(),
        password,
      });

      const payload = res.data?.data || {};
      const token = payload.token;
      const user = payload.user;
      const expiresIn = payload.expiresIn;

      if (!token || !user) throw new Error("Unexpected login response");

      const expiresAt = Date.now() + parseExpiresInToMs(expiresIn);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("expiresAt", String(expiresAt));

      router.push(next);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-xl sm:text-2xl font-semibold">Login</h1>
        <p className="mt-1 text-sm opacity-80">Welcome back to NyumbaConnect.</p>

        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-2xl bg-[var(--taupe-300)] p-4 sm:p-5"
        >
          {error && (
            <div className="mb-3 rounded-2xl bg-white/60 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium">Phone number</label>
          <input
            className="mt-1 w-full rounded-2xl bg-white px-4 py-3 outline-none"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 07xx xxx xxx"
            inputMode="tel"
            autoComplete="tel"
            required
          />

          <label className="mt-4 block text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded-2xl bg-white px-4 py-3 outline-none"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-2xl bg-white px-4 py-3 font-semibold shadow-sm disabled:opacity-60"
          >
            {busy ? "Logging in…" : "Login"}
          </button>

          <p className="mt-4 text-sm">
            Don’t have an account?{" "}
            <Link className="underline" href="/register">
              Register
            </Link>
          </p>
        </form>

        <button
          className="mt-4 underline text-sm"
          onClick={() => router.push(next)}
        >
          ← Back
        </button>
      </div>
    </main>
  );
}