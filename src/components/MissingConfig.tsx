/** Écran d'aide affiché tant que les clés Convex / Clerk ne sont pas configurées. */
export function MissingConfig({ missing }: { missing: string[] }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center text-xl">
            ♻️
          </div>
          <h1 className="text-2xl font-bold">Recyclerie</h1>
        </div>
        <h2 className="text-lg font-semibold text-amber-400 mb-2">
          Configuration requise
        </h2>
        <p className="text-zinc-400 mb-4">
          Variables d'environnement manquantes&nbsp;:
        </p>
        <ul className="mb-6 space-y-1">
          {missing.map((m) => (
            <li
              key={m}
              className="font-mono text-sm text-amber-300 bg-zinc-950 rounded px-3 py-1.5 border border-zinc-800"
            >
              {m}
            </li>
          ))}
        </ul>
        <ol className="space-y-3 text-sm text-zinc-300 list-decimal list-inside">
          <li>
            Lancez <code className="text-brand-400">npx convex dev</code> — il
            remplit <code>VITE_CONVEX_URL</code> automatiquement.
          </li>
          <li>
            Créez une app Clerk, copiez la{" "}
            <em>Publishable key</em> dans{" "}
            <code>.env.local</code> (
            <code className="text-brand-400">VITE_CLERK_PUBLISHABLE_KEY</code>).
          </li>
          <li>
            Créez un JWT Template Clerk nommé <code>convex</code>, puis{" "}
            <code className="text-brand-400">
              npx convex env set CLERK_JWT_ISSUER_DOMAIN …
            </code>
          </li>
          <li>Relancez le serveur de dev.</li>
        </ol>
        <p className="mt-6 text-xs text-zinc-500">
          Détails complets dans le fichier <code>README.md</code>.
        </p>
      </div>
    </div>
  );
}
