const base = process.env.SYEGAR_URL;
if (!base) {
  throw new Error("Set SYEGAR_URL ke URL aplikasi online sebelum menjalankan smoke test.");
}

async function request(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) }
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { ok: false, message: text }; }
  if (!res.ok || json.ok === false) throw new Error(`${path}: ${json.message || res.status}`);
  return json.data;
}

async function main() {
  await request("/api/dashboard");
  await request("/api/menus");
  await request("/api/ingredients");
  await request("/api/options");
  await request("/api/reports");
  console.log("Smoke test OK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
