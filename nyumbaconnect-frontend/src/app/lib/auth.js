function isExpired(expiresAt) {
  const n = Number(expiresAt || 0);
  return !!n && Date.now() > n;
}

export function getAuth() {
  if (typeof window === "undefined") return { token: null, user: null };

  const token = localStorage.getItem("token");
  const expiresAt = localStorage.getItem("expiresAt");
  const expired = isExpired(expiresAt);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  if (!token || expired) return { token: null, user: null };

  return { token, user };
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("expiresAt");
}