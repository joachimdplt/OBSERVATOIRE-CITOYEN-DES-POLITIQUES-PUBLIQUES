/**
 * Les façons de deviner le sujet d'un extrait : la grille, les voisins, le
 * modèle, et le classement du candidat lui-même (le titre de son document,
 * et ce titre avec sa rubrique).
 */
export type Method = 'grille' | 'voisins' | 'modele' | 'titre' | 'rubrique';

export type Proposal = { method: Method; code: string | null };

/**
 * Le vote. Le modèle range quand au moins une autre voix donne le même
 * sujet : mesuré sur 157 blocs vérifiés, c'est juste 91 fois sur 100 (±5),
 * pour trois blocs sur quatre. Sinon, une personne tranche : seul de son
 * avis, le modèle n'a raison qu'une fois sur cinq. Le classement du
 * candidat (titre, rubrique) ne décide jamais seul : il peut seulement
 * confirmer le modèle.
 */
export function vote(
  proposals: Proposal[],
): { agreed: true; code: string } | { agreed: false } {
  const model = proposals.find((p) => p.method === 'modele')?.code;
  if (!model) return { agreed: false };
  const others = proposals.filter((p) => p.method !== 'modele');
  return others.some((p) => p.code === model)
    ? { agreed: true, code: model }
    : { agreed: false };
}

/** Un vecteur rangé en base (float32 à la suite). */
export const toVector = (bytes: Uint8Array) =>
  new Float32Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );

export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return dot / Math.sqrt(x * y || 1);
}

/** Le vecteur moyen de quelques passages : le sens d'un bloc. */
export function mean(vectors: Float32Array[]): Float32Array {
  const out = new Float32Array(vectors[0].length);
  for (const v of vectors)
    for (let i = 0; i < v.length; i++) out[i] += v[i] / vectors.length;
  return out;
}

/** Le grand sujet de la grille le plus proche par le sens. */
export function nearestTopic(
  v: Float32Array,
  topics: { major: string; vector: Float32Array }[],
): string | null {
  let best: string | null = null;
  let score = -Infinity;
  for (const t of topics) {
    const s = cosine(v, t.vector);
    if (s > score) {
      score = s;
      best = t.major;
    }
  }
  return best;
}

/**
 * Le sujet des passages déjà rangés les plus proches, hors du chapitre
 * lui-même : chaque voisin vote, pesé par sa proximité.
 */
export function neighboursTopic(
  v: Float32Array,
  known: { chapter: string; code: string; vector: Float32Array }[],
  chapter: string,
  count = 10,
): string | null {
  const near = known
    .filter((k) => k.chapter !== chapter)
    .map((k) => ({ code: k.code, s: cosine(v, k.vector) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count);
  const votes = new Map<string, number>();
  for (const n of near) votes.set(n.code, (votes.get(n.code) ?? 0) + n.s);
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
