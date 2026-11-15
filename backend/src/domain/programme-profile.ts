/**
 * Le profil d'un programme lu en entier : son vocabulaire propre et ses
 * propositions. Tout est compté ou cité, rien n'est reformulé ni jugé.
 */

/** Les mots qui ne disent rien d'un programme : articles, liaisons, verbes d'usage. */
const STOPWORDS = new Set(
  `a afin ai ainsi alors après au aucun aujourd aujourd'hui aussi autre autres aux avec avoir avons bien c ça car ce cela celle celles celui ces cet cette chaque chez comme comment contre d dans de des deux dès doit doivent donc dont du elle elles en encore entre est et etc été être eux fait faire faut fois font grâce ici il ils je jusqu l la le les leur leurs lors lui m ma mais me même mêmes mes moins mon n ne ni non nos notre nous on ont ou où par parce pas peu peut peuvent plus pour pourra pourront qu quand que quel quelle quelles quels qui sa sans se selon ses si sein seront seul seule sera son sont sous sur ta tant te tel telle tels tes toi ton tous tout toute toutes très trop tu un une unes uns vers via vos votre vous y
  ans an année années aujourd'hui afin cas cadre façon fin mettre mise mis place permettre permet faire fait rendre garantir assurer renforcer développer soutenir créer cette ceux celles enfin également notamment ensemble ainsi lors toujours jamais déjà plusieurs certains certaines nouveau nouvelle nouveaux nouvelles grand grande grands grandes petit petite chaque partout ensemble milliard milliards million millions euros euro france français française françaises
  chapitre chapitres partie parties titre axe axes priorité priorités proposition propositions
  propose proposons proposé proposée tient demeure environ nettement dite dits dites lorsqu lorsque puisque tandis souhaitons entendons
  janvier février mars avril juin juillet août septembre octobre novembre décembre
  chapitre chapitres partie parties titre axe axes priorité priorités proposition propositions
  pays nation national nationale nationaux nationales politique politiques public publique publics publiques état etat services service système mesure mesures proposons voulons veut vouloir doit devra devons faut objectif objectifs`
    .split(/\s+/)
    .filter(Boolean),
);

/** Les mots d'un texte, en minuscules, sans les mots vides ni les nombres. */
export function wordsOf(text: string): string[] {
  return (
    (
      text
        .toLowerCase()
        // L'écriture inclusive (« travailleur·ses ») garde le mot, pas sa fin.
        .replace(/[·•]\p{L}+(?:[·•]\p{L}+)?/gu, '')
        .match(/\p{L}[\p{L}’'-]*\p{L}/gu) ?? []
    )
      .map((w) => w.replace(/^[ldjmnstc][’']/u, '').replace(/[’']$/u, ''))
      .filter(
        (w) =>
          w.length >= 4 &&
          !STOPWORDS.has(w) &&
          // Les infinitifs et les futurs disent l'action, pas le sujet :
          // « adopter », « agir », « engagerons », « reposera ».
          !/(er|ir|rons|rez|ront|era|ira)$/u.test(w) &&
          // Les verbes conjugués au pluriel : « visent », « doivent ».
          !/[^aeiouy]ent$/u.test(
            w.replace(
              /(gem|vem|lem|nem|rem|tem|dem|cem|sem|ram|lam)ent$/u,
              'x',
            ),
          ),
      )
  );
}

/**
 * La racine d'un mot, pour compter ensemble ses flexions (« logement » et
 * « logements ») : sans accents ni capitales, suffixes flexionnels retirés.
 * Repris des outils de texte de seo-factory
 * (backend/src/content/competitor/keyword-text.ts), volontairement grossier.
 */
export const stemOf = (w: string): string =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(ements|ement|eurs|euse|eres|ere|ers|es|s)$/, '');

export type VocabularyWord = { word: string; count: number; ratio: number };

/**
 * Le vocabulaire propre d'un programme : les mots qu'il emploie nettement
 * plus que l'ensemble des autres programmes, rapportés à leurs longueurs
 * (avec un lissage d'une occurrence). Compté par racine, affiché sous la
 * forme la plus employée ; un mot doit revenir au moins `minCount` fois.
 */
export function distinctiveVocabulary(
  own: string[],
  others: string[],
  {
    limit = 24,
    minCount = 4,
    exclude = [],
  }: { limit?: number; minCount?: number; exclude?: string[] } = {},
): VocabularyWord[] {
  // Le nom du candidat n'est pas son vocabulaire.
  const excluded = new Set(exclude.flatMap((e) => wordsOf(e)).map(stemOf));
  const forms = new Map<string, Map<string, number>>();
  const count = (texts: string[], keepForms: boolean) => {
    const m = new Map<string, number>();
    let total = 0;
    for (const t of texts)
      for (const w of wordsOf(t)) {
        const root = stemOf(w);
        if (root.length < 4) continue;
        m.set(root, (m.get(root) ?? 0) + 1);
        total++;
        if (keepForms) {
          const f = forms.get(root) ?? new Map<string, number>();
          f.set(w, (f.get(w) ?? 0) + 1);
          forms.set(root, f);
        }
      }
    return { m, total: Math.max(1, total) };
  };
  const a = count(own, true);
  const b = count(others, false);
  const display = (root: string) =>
    [...(forms.get(root) ?? new Map<string, number>()).entries()].sort(
      (x, y) => y[1] - x[1],
    )[0]?.[0] ?? root;
  return [...a.m.entries()]
    .filter(([root, c]) => c >= minCount && !excluded.has(root))
    .map(([root, c]) => ({
      word: display(root),
      count: c,
      ratio: c / a.total / (((b.m.get(root) ?? 0) + 1) / b.total),
    }))
    .filter((w) => w.ratio >= 1.5)
    .sort((x, y) => y.ratio * Math.log(y.count) - x.ratio * Math.log(x.count))
    .slice(0, limit);
}

/** Des mots en -er, -ir ou -re qui ne sont pas des verbes. */
const NOT_VERBS = new Set([
  'Notre',
  'Votre',
  'Entre',
  'Contre',
  'Autre',
  'Premier',
  'Dernier',
  'Hier',
  'Leur',
  'Plaisir',
  'Avenir',
  'Pouvoir',
  'Savoir',
  'Devoir',
  'Cadre',
  'Ordre',
  'Nombre',
  'Centre',
  'Titre',
  'Chiffre',
  'Lettre',
  'Ministre',
  'Mer',
  'Fer',
  'Hiver',
  'Quartier',
  'Dossier',
  'Métier',
]);

/** Une proposition : un passage qui commence par un verbe d'action à l'infinitif. */
export function isProposal(text: string): boolean {
  const first =
    text
      .trim()
      .replace(/^[\d.)\s•–-]+/, '')
      .split(/\s+/)[0] ?? '';
  return (
    /^\p{Lu}\p{Ll}+(er|ir|re|oir)$/u.test(first) &&
    first.length > 3 &&
    !NOT_VERBS.has(first)
  );
}

/** Un passage chiffré : un nombre suivi d'une unité (%, euros, milliards…). */
export function isFigured(text: string): boolean {
  return /\d[\d\s,.]*\s?(%|€|euros?\b|milliards?\b|millions?\b|\bans?\b|\bheures?\b|\bTWh\b|\bpostes?\b|\blogements?\b|\bplaces?\b)/iu.test(
    text,
  );
}
