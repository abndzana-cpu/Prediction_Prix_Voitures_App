const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur (${res.status})`);
  }
  return data;
}

export const api = {
  getOptions: () => request("/api/options"),
  predict: (payload) =>
    request("/api/predict", { method: "POST", body: JSON.stringify(payload) }),
  feedback: (id, rating) =>
    request("/api/feedback", { method: "POST", body: JSON.stringify({ id, rating }) }),
  getHistory: () => request("/api/history"),
  clearHistory: () => request("/api/history", { method: "DELETE" }),
  getStats: () => request("/api/stats"),
  uploadImage: (file) => {
    const form = new FormData();
    form.append("image", file);
    return request("/api/upload-image", { method: "POST", body: form });
  },
  imageUrl: (path) => (path ? `${API_BASE}${path}` : null),
};

export default api;