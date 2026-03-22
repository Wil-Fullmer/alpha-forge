// Fixture mode (default): VITE_API_URL unset → BASE = '' → relative path → Vite proxy → localhost:3001
// Backend mode: set VITE_API_URL=http://localhost:3000 in frontend/.env.local → requests go direct;
//   CORS is open on the real backend (Access-Control-Allow-Origin: *).

const BASE = import.meta.env.VITE_API_URL ?? '';

async function request(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) {
    throw new Error(`API error ${res.status} — ${res.statusText} (${path})`);
  }
  return res.json();
}

export default request;
