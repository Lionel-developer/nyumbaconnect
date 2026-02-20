export function getAuth() {
  if (typeof window === "undefined") return { token: null, user: null };

  const token = localStorage.getItem("token");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const expiresAt = Number(localStorage.getItem("expiresAt") || 0);
  const expired = expiresAt && Date.now() > expiresAt;

  if (!token || expired) return { token: null, user: null };

  return { token, user };
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("expiresAt");
}