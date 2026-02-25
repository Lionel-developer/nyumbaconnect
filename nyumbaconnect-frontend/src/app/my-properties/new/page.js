"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { getAuth } from "../../lib/auth";

const PROPERTY_TYPES = [
  "bedsitter",
  "studio",
  "apartment",
  "1-bedroom",
  "2-bedroom",
  "3-bedroom",
  "commercial",
];

const AMENITIES = [
  "water",
  "electricity",
  "parking",
  "security",
  "furnished",
  "WiFi",
  "gym",
  "swimming pool",
];

function cleanText(v) {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}
function cleanOptText(v) {
  const t = cleanText(v);
  return t ? t : undefined;
}
function cleanNumber(v) {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function sanitizePropertyForm(form) {
  const title = cleanText(form.title);
  const description = cleanText(form.description);
  const location = cleanText(form.location);

  const payload = {
    title,
    description,
    location,
    area: cleanOptText(form.area),
    nearby: cleanText(form.nearby || "")
      .split(",")
      .map((s) => cleanText(s))
      .filter(Boolean),
    propertyType: cleanText(form.propertyType),
    price: cleanNumber(form.price),
    amenities: (form.amenities || []).filter((a) => AMENITIES.includes(a)),
    rules: {
      pets: !!form.pets,
      children: !!form.children,
      visitors: form.visitors === "restricted" ? "restricted" : "allowed",
      depositMonths: cleanNumber(form.depositMonths) ?? 1,
    },
    contactPerson: cleanOptText(form.contactPerson),
    contactPhone: cleanOptText(form.contactPhone),
  };

  if (!payload.area) delete payload.area;
  if (!payload.nearby.length) delete payload.nearby;
  if (!payload.amenities.length) delete payload.amenities;
  if (!payload.contactPerson) delete payload.contactPerson;
  if (!payload.contactPhone) delete payload.contactPhone;

  return payload;
}

export default function NewPropertyPage() {
  const router = useRouter();

  // ✅ stable initial values (prevents hydration mismatch)
  const [auth, setAuth] = useState({ token: null, user: null });
  const [authReady, setAuthReady] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    area: "",
    nearby: "",
    propertyType: "apartment",
    price: "",
    amenities: [],
    pets: false,
    children: true,
    visitors: "allowed",
    depositMonths: "1",
    contactPerson: "",
    contactPhone: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setAuth(getAuth());
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!auth.token) router.push("/login?next=/my-properties/new");
  }, [authReady, auth.token, router]);

  const isLandlordOrAgent = useMemo(() => {
    const t = String(auth?.user?.userType || "").toLowerCase();
    return t === "landlord" || t === "agent";
  }, [auth]);

  const controlClass =
    "w-full rounded-2xl bg-white px-4 py-3 text-gray-900 outline-none " +
    "ring-1 ring-black/10 shadow-sm hover:ring-black/20 " +
    "focus:ring-2 focus:ring-zinc-900/40 transition";

  const toggleAmenity = (a) => {
    setForm((prev) => {
      const has = prev.amenities.includes(a);
      return {
        ...prev,
        amenities: has ? prev.amenities.filter((x) => x !== a) : [...prev.amenities, a],
      };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = sanitizePropertyForm(form);

    if (!payload.title) return setError("Title is required");
    if (!payload.description) return setError("Description is required");
    if (!payload.location) return setError("Location is required");
    if (!PROPERTY_TYPES.includes(payload.propertyType)) return setError("Select a valid property type");
    if (!payload.price || payload.price <= 0) return setError("Price must be greater than 0");

    try {
      setBusy(true);
      const res = await api.post("/api/properties", payload);
      const newId = res.data?.data?.property?._id;

      // ✅ Go to edit page so landlord can upload images immediately
      router.push(newId ? `/my-properties/${newId}/edit` : "/my-properties");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create property");
    } finally {
      setBusy(false);
    }
  };

  if (!authReady) {
    return (
      <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
        <p>Loading…</p>
      </main>
    );
  }

  if (!auth.token) {
    return (
      <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
        <p>Redirecting to login…</p>
      </main>
    );
  }

  if (!isLandlordOrAgent) {
    return (
      <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <Link className="underline" href="/my-properties">
            ← My Listings
          </Link>
          <p className="mt-4 text-red-700">Only landlords/agents can create properties.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-5 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold">Create new property</h1>
          <Link className="underline" href="/my-properties">
            My Listings
          </Link>
        </header>

        {error && <p className="mt-3 text-red-700">{error}</p>}

        <form onSubmit={onSubmit} className="mt-4 rounded-2xl bg-[var(--taupe-300)] p-4 sm:p-5">
          <div className="grid gap-3">
            <input
              className={controlClass}
              placeholder="Title (e.g. Modern 1-bedroom in Ruaka)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <textarea
              className={controlClass}
              rows={5}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <input
              className={controlClass}
              placeholder="Location (e.g. Kiambu, Ruaka)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />

            <input
              className={controlClass}
              placeholder="Area (optional, e.g. Ndenderu)"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />

            <input
              className={controlClass}
              placeholder="Nearby (comma separated, optional)"
              value={form.nearby}
              onChange={(e) => setForm({ ...form, nearby: e.target.value })}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <select
                className={controlClass}
                value={form.propertyType}
                onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <input
                className={controlClass}
                placeholder="Price (KES)"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>

            <div className="rounded-2xl bg-neutral-300 p-4">
              <p className="font-semibold">Amenities</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AMENITIES.map((a) => {
                  const active = form.amenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={
                        "rounded-full px-3 py-1 text-sm ring-1 ring-black/10 transition " +
                        (active ? "bg-sky-300" : "bg-white hover:bg-black/5")
                      }
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.pets}
                  onChange={(e) => setForm({ ...form, pets: e.target.checked })}
                />
                Pets allowed
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.children}
                  onChange={(e) => setForm({ ...form, children: e.target.checked })}
                />
                Children allowed
              </label>

              <select
                className={controlClass}
                value={form.visitors}
                onChange={(e) => setForm({ ...form, visitors: e.target.value })}
              >
                <option value="allowed">Visitors allowed</option>
                <option value="restricted">Visitors restricted</option>
              </select>

              <input
                className={controlClass}
                placeholder="Deposit months (e.g. 1)"
                inputMode="numeric"
                value={form.depositMonths}
                onChange={(e) => setForm({ ...form, depositMonths: e.target.value })}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={controlClass}
                placeholder="Contact person (optional)"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
              <input
                className={controlClass}
                placeholder="Contact phone (optional)"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>

            <button
              disabled={busy}
              className="mt-2 rounded-2xl bg-emerald-200 px-4 py-3 font-semibold shadow-sm disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create property"}
            </button>

            <p className="text-xs opacity-70">
              After creating, you’ll be taken to edit page to upload images.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}