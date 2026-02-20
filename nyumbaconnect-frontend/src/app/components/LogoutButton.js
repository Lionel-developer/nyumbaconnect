"use client";

import { useRouter } from "next/navigation";
import { logout } from "../lib/auth";

export default function LogoutButton({ className = "" }) {
  const router = useRouter();

  const onLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <button
      onClick={onLogout}
      className={
        "rounded-2xl bg-[var(--taupe-300)] px-4 py-2 text-sm font-semibold text-gray-900 " +
        "shadow-sm ring-1 ring-black/10 " +
        "hover:bg-neutral-300 hover:ring-black/20 " +
        "focus:outline-none focus:ring-2 focus:ring-zinc-900/40 " +
        "active:scale-[0.99] transition " +
        className
      }
    >
      Logout
    </button>
  );
}