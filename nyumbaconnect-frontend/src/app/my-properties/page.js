"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { getAuth } from "../lib/auth";

export default function MyPropertiesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [auth, setAuth] = useState({ token: null, user: null });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const a = getAuth();
    setAuth(a);
    setAuthReady(true);

    if (!a?.token) {
      router.push("/login?next=/my-properties");
      return;
    }

    let mounted = true;

    api
      .get("/api/properties/mine")
      .then((res) => {
        if (!mounted) return;
        setItems(res.data?.data?.properties ?? []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Failed to load your properties");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => (mounted = false);
  }, [router]);

  const onDelete = async (id) => {
    const ok = window.confirm("Delete this property? This will remove it from public listings.");
    if (!ok) return;

    try {
      setBusyId(id);
      setError("");
      await api.delete(`/api/properties/${id}`);
      setItems((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setError(err?.response?.data?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const cardClass =
    "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/10 hover:ring-black/20 transition";

  if (!authReady) {
    return (
      <main className="min-h-screen bg-neutral-300 px-4 py-5">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
      <header className="mx-auto w-full max-w-6xl flex items-center justify-between gap-3">

        <Link
          href="/"
          className="underline decoration-black/30 underline-offset-4 hover:decoration-black/70 transition"
        >
          Home
        </Link>
      </header>
      <header className="mx-auto w-full max-w-6xl flex items-center justify-between gap-3">
  <h1 className="text-xl sm:text-2xl font-semibold">My Listings</h1>

  <div className="flex items-center gap-3">
    <Link
      href="/my-properties/new"
      className="rounded-2xl bg-emerald-200 px-4 py-2 text-sm font-semibold"
    >
      + New
    </Link>
  </div>
</header>

      <div className="mx-auto w-full max-w-6xl mt-4">
        {loading && <p>Loading your properties…</p>}
        {!loading && error && <p className="text-red-700">{error}</p>}
        {!loading && !error && items.length === 0 && <p>You have no listings yet.</p>}
      </div>

      <section className="mx-auto w-full max-w-6xl mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <div key={p._id} className={cardClass}>
            <h2 className="font-semibold line-clamp-1">{p.title || "Untitled"}</h2>
            <p className="mt-1 text-sm opacity-80 line-clamp-1">
              {p.location || p.area || "—"}
            </p>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold">{p.price ? `KES ${p.price}` : ""}</span>
              <span className="text-xs rounded-full bg-neutral-200 px-3 py-1">
                {p.propertyType}
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href={`/my-properties/${p._id}/edit`}
                className="flex-1 rounded-2xl bg-sky-300 px-4 py-2 text-center font-semibold"
              >
                Edit
              </Link>

              <button
                onClick={() => onDelete(p._id)}
                disabled={busyId === p._id}
                className="flex-1 rounded-2xl bg-amber-300 px-4 py-2 font-semibold disabled:opacity-60"
              >
                {busyId === p._id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}