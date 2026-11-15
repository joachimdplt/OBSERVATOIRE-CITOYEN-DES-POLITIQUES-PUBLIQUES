/** L'API ne répond pas : on le dit, sans afficher de chiffre ni rester suspendu. */
export function Unavailable() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-2 px-6 py-24">
      <h1 className="text-xl font-semibold">
        Données momentanément indisponibles
      </h1>
      <p className="text-sm text-slate-500">
        L’observatoire n’a pas pu lire ses données. Réessayez dans un instant.
      </p>
    </div>
  )
}
