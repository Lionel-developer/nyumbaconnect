"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "./lib/api";
import { getAuth, logout } from "./lib/auth";

export default function Home() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [brokenImages, setBrokenImages] = useState(() => new Set());

  // ✅ Start with a stable value to avoid hydration mismatch
  const [auth, setAuth] = useState({ token: null, user: null });
  const [authReady, setAuthReady] = useState(false);

  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState("all");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ✅ Read auth only after mount (client-side)
  useEffect(() => {
    try {
      setAuth(getAuth());
    } finally {
      setAuthReady(true);
    }
  }, []);

  // ✅ Keep auth in sync after login/logout in other tabs or when returning to this tab
  useEffect(() => {
    const refreshAuth = () => setAuth(getAuth());
    if (typeof window !== "undefined") {
      window.addEventListener("focus", refreshAuth);
      window.addEventListener("storage", refreshAuth);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", refreshAuth);
        window.removeEventListener("storage", refreshAuth);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    api
      .get("/api/properties")
      .then((res) => {
        if (!mounted) return;
        setProperties(res.data?.data?.properties ?? []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Failed to reach backend");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const markBroken = (propertyId) => {
    setBrokenImages((prev) => {
      const next = new Set(prev);
      next.add(propertyId);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;

    const asText = (v) => String(v ?? "").toLowerCase();

    if (metric === "priceMax") {
      const max = Number(q.replace(/[^\d]/g, ""));
      if (!max) return properties;
      return properties.filter((p) => {
        const price = Number(p.price ?? 0);
        return price > 0 && price <= max;
      });
    }

    return properties.filter((p) => {
      const title = asText(p.title);
      const location = asText(p.location || p.area);
      const type = asText(p.propertyType || p.type);

      if (metric === "title") return title.includes(q);
      if (metric === "location") return location.includes(q);
      if (metric === "type") return type.includes(q);

      return title.includes(q) || location.includes(q) || type.includes(q);
    });
  }, [properties, query, metric]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];

    const unique = new Set();
    const add = (value) => {
      const text = String(value ?? "").trim();
      if (text) unique.add(text);
    };

    properties.forEach((p) => {
      const title = p.title;
      const location = p.location || p.area;
      const type = p.propertyType || p.type;

      if (metric === "title") {
        add(title);
        return;
      }
      if (metric === "location") {
        add(location);
        return;
      }
      if (metric === "type") {
        add(type);
        return;
      }
      if (metric === "priceMax") {
        if (p.price !== undefined && p.price !== null) add(`KES ${p.price}`);
        return;
      }

      add(title);
      add(location);
      add(type);
    });

    return [...unique]
      .filter((value) => value.toLowerCase().includes(q))
      .slice(0, 8);
  }, [properties, query, metric]);

  // ✅ landlord/agent-only link visibility (your user uses userType)
  const isLandlordOrAgent = useMemo(() => {
    const t = String(auth?.user?.userType || "").toLowerCase();
    return t === "landlord" || t === "agent";
  }, [auth]);

  const onLogout = () => {
    logout();
    setAuth({ token: null, user: null });
  };

  const linkClass =
    "underline decoration-black/30 underline-offset-4 hover:decoration-black/70 transition";

  const controlClass =
    "w-full rounded-2xl bg-white px-4 py-3 text-gray-900 outline-none " +
    "ring-1 ring-black/10 shadow-sm " +
    "hover:ring-black/20 " +
    "focus:ring-2 focus:ring-zinc-900/40 transition";

  return (
    <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
      <header className="mx-auto w-full max-w-6xl flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">NyumbaConnect</h1>

        <nav className="flex items-center gap-4 text-sm">
          <Link className={linkClass} href="/favorites">
            Favorites
          </Link>

          {authReady && auth.token && isLandlordOrAgent && (
            <Link className={linkClass} href="/my-properties">
              My Listings
            </Link>
          )}

          {authReady ? (
            auth.token ? (
              <button
                onClick={onLogout}
                className="underline decoration-red-400 underline-offset-4 text-red-700 hover:decoration-red-700 hover:text-red-800 transition"
              >
                Logout
              </button>
            ) : (
              <Link className={linkClass} href="/login">
                Login
              </Link>
            )
          ) : (
            <span className="opacity-60">…</span>
          )}
        </nav>
      </header>

      {/* Search bar */}
      <div className="mx-auto w-full max-w-6xl mt-4 rounded-2xl bg-[var(--taupe-300)] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative w-full">
            <input
              className={controlClass}
              placeholder="Search properties…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 120);
              }}
            />

            {showSuggestions &&
              query.trim().length >= 3 &&
              suggestions.length > 0 && (
                <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/10">
                  {suggestions.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        className="block w-full px-4 py-2 text-left text-sm text-zinc-900 hover:bg-neutral-100"
                        onMouseDown={() => {
                          setQuery(option);
                          setShowSuggestions(false);
                        }}
                      >
                        {option}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>

          <div className="relative w-full sm:w-56">
            <select
              className={"appearance-none pr-10 " + controlClass}
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              <option value="all">All</option>
              <option value="location">Location</option>
              <option value="title">Title</option>
              <option value="type">Type</option>
              <option value="priceMax">Max price (KES)</option>
            </select>

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-700">
              ▾
            </span>
          </div>
        </div>

        {!!query.trim() && (
          <p className="mt-2 text-xs opacity-70">
            Showing {filtered.length} of {properties.length}
          </p>
        )}
      </div>

      <div className="mx-auto w-full max-w-6xl mt-4">
        {loading && <p>Loading properties…</p>}
        {!loading && error && <p className="text-red-700">{error}</p>}
        {!loading && !error && filtered.length === 0 && <p>No matches.</p>}
      </div>

      <section className="mx-auto w-full max-w-6xl mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const imgUrl =
            p.primaryImage || p.images?.find((i) => i.isPrimary)?.url || "";
          const showImage = imgUrl && !brokenImages.has(p._id);

          return (
            <Link
              key={p._id}
              href={`/properties/${p._id}`}
              className="rounded-2xl bg-[var(--taupe-300)] p-4 sm:p-5 shadow-sm ring-1 ring-black/10 hover:ring-black/20 active:scale-[0.99] transition"
            >
              <div className="aspect-[16/11] sm:aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/5 flex items-center justify-center">
                {showImage ? (
                  <img
                    src={imgUrl}
                    alt={p.title || "Property"}
                    className="h-full w-full object-cover"
                    onError={() => markBroken(p._id)}
                  />
                ) : (
                  <span className="text-sm opacity-70">No image</span>
                )}
              </div>

              <div className="mt-3">
                <h2 className="text-base sm:text-lg font-semibold line-clamp-1">
                  {p.title || "Untitled property"}
                </h2>

                <p className="mt-1 text-sm opacity-80 line-clamp-1">
                  {p.location || p.area || "Location not set"}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-neutral-300 px-3 py-1 text-xs font-medium">
                    {p.propertyType || p.type || "Listing"}
                  </span>
                  <span className="text-sm font-semibold">
                    {p.price ? `KES ${p.price}` : ""}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}