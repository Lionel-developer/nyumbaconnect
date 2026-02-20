"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "../components/LogoutButton";
import { getAuth } from "../lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [auth, setAuth] = useState({ token: null, user: null });

  useEffect(() => {
    const a = getAuth();
    setAuth(a);
    if (!a.token) router.push("/login?next=/profile");
  }, [router]);

  const user = auth.user;

  return (
    <main className="min-h-screen bg-neutral-300 text-zinc-900 px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold">Profile</h1>
          {auth.token && <LogoutButton />}
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--taupe-300)] p-4 sm:p-5">
          {!user ? (
            <p className="text-sm opacity-80">Loading…</p>
          ) : (
            <div className="space-y-2 text-sm sm:text-base">
              <p>
                <span className="font-semibold">Name:</span>{" "}
                {user.fullName || user.name || "-"}
              </p>
              <p>
                <span className="font-semibold">Phone:</span>{" "}
                {user.phoneNumber || "-"}
              </p>
              <p>
                <span className="font-semibold">User type:</span>{" "}
                {user.userType || user.role || "-"}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {user.email || "-"}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}