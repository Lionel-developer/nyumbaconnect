"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { getAuth } from "../../lib/auth";

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [property, setProperty] = useState(null);
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ✅ stable during first render
  const [auth, setAuth] = useState({ token: null, user: null });
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    try {
      setAuth(getAuth());
    } finally {
      setAuthReady(true);
    }
  }, []);

  // keep auth in sync if login/logout happens elsewhere
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

  const isLoggedIn = !!auth.token;

  // landlord/agent check (your user uses userType)
  const isLandlordOrAgent = useMemo(() => {
    const t = String(auth?.user?.userType || "").toLowerCase();
    return t === "landlord" || t === "agent";
  }, [auth]);

  // show edit link only for owners (backend marks this as "owner")
  const canEdit = isLoggedIn && isLandlordOrAgent && visibility === "owner";

  const fetchProperty = useCallback(async () => {
    const res = await api.get(`/api/properties/${id}`);
    setProperty(res.data?.data?.property || null);
    setVisibility(res.data?.visibility || "public");
  }, [id]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError("");
        await fetchProperty();
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Failed to load property");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchProperty]);

  const onUnlock = async () => {
    // If auth status isn't loaded yet, treat as not logged in
    if (!authReady || !isLoggedIn) {
      router.push(`/login?next=/properties/${id}`);
      return;
    }

    try {
      setBusy(true);
      setError("");
      await api.post(`/api/properties/${id}/unlock`);
      await fetchProperty();
    } catch (err) {
      setError(err?.response?.data?.message || "Unlock failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
        <p>Loading…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
        <button className="underline" onClick={() => router.back()}>
          ← Back
        </button>
        <p className="mt-4 text-red-700">{error}</p>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
        <button className="underline" onClick={() => router.back()}>
          ← Back
        </button>
        <p className="mt-4">Property not found.</p>
      </main>
    );
  }

  const images = property.images || [];
  const primaryUrl =
    images.find((i) => i.isPrimary)?.url || images[0]?.url || "";

  return (
    <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <button className="underline" onClick={() => router.back()}>
            ← Back
          </button>

          {canEdit && (
            <Link
              href={`/my-properties/${id}/edit`}
              className="rounded-2xl bg-sky-300 px-4 py-2 text-sm font-semibold"
            >
              Edit listing
            </Link>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Images */}
          <section className="rounded-2xl bg-[var(--taupe-300)] p-4 sm:p-5">
            <div className="aspect-[16/11] sm:aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/5 flex items-center justify-center">
              {primaryUrl ? (
                <img
                  src={primaryUrl}
                  alt={property.title || "Property"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span className="text-sm opacity-70">No image</span>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {images.slice(0, 8).map((img) => (
                  <div
                    key={img._id || img.url}
                    className="aspect-square overflow-hidden rounded-xl bg-black/5"
                  >
                    <img
                      src={img.url}
                      alt="thumbnail"
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Details */}
          <section className="rounded-2xl bg-[var(--taupe-300)] p-4 sm:p-5">
            <h1 className="text-xl sm:text-2xl font-semibold">
              {property.title || "Untitled property"}
            </h1>

            <p className="mt-1 text-sm sm:text-base opacity-80">
              {property.location || property.area || ""}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {(property.propertyType || property.type) && (
                <span className="rounded-full bg-neutral-300 px-3 py-1 text-xs font-medium">
                  {property.propertyType || property.type}
                </span>
              )}
              <span className="rounded-full bg-neutral-300 px-3 py-1 text-xs font-medium">
                Visibility: {visibility}
              </span>
            </div>

            {property.price && (
              <p className="mt-4 text-lg sm:text-xl font-semibold">
                KES {property.price}
              </p>
            )}

            {property.description && (
              <p className="mt-4 text-sm sm:text-base leading-relaxed">
                {property.description}
              </p>
            )}

            {/* Contact block (visibility-driven) */}
            <div className="mt-6 rounded-2xl bg-neutral-300 p-4">
              {visibility === "public" ? (
                <>
                  <p className="font-semibold">Contact is locked</p>
                  <p className="mt-1 text-sm sm:text-base opacity-80">
                    Unlock to view the landlord/agent phone number.
                  </p>

                  <button
                    onClick={onUnlock}
                    disabled={busy}
                    className="mt-3 w-full sm:w-auto rounded-2xl bg-white px-4 py-3 font-semibold shadow-sm disabled:opacity-60"
                  >
                    {busy ? "Unlocking…" : "Unlock contact"}
                  </button>

                  {authReady && !isLoggedIn && (
                    <p className="mt-2 text-xs opacity-70">
                      You’ll be asked to login first.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-semibold">Contact</p>
                  <p className="mt-1 text-sm sm:text-base">
                    {property.contactPerson || "Contact person"}
                  </p>
                  <p className="text-sm sm:text-base">
                    {property.contactPhone || "Contact phone"}
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}