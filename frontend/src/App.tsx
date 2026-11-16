import { useEffect, useState } from "react";

type Health = { status: string; database: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Same origin as the page, so this goes through nginx to Express.
    fetch("/api/health")
      .then((res) => res.json() as Promise<Health>)
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main>
      <h1>Personal Data</h1>
      <section>
        <h2>Server status</h2>
        {error && <p>Could not reach the server: {error}</p>}
        {!error && !health && <p>Checking…</p>}
        {health && (
          <dl>
            <dt>API</dt>
            <dd>{health.status}</dd>
            <dt>Database</dt>
            <dd>{health.database}</dd>
          </dl>
        )}
      </section>
    </main>
  );
}
