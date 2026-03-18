// All requests use relative paths (/api/...) so the Vite proxy forwards
// them to the fixture server at http://localhost:3001. This avoids CORS
// in development and keeps network config in one place (vite.config.js).

async function request(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`API error ${res.status} — ${res.statusText} (${path})`);
  }
  return res.json();
}

export default request;
