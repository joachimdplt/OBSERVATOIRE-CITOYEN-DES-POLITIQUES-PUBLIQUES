/**
 * L'unité rangée par sujet. Par défaut, le chapitre : un titre et ses
 * passages, ou chaque bloc d'un long chapitre. Pour un texte suivi, sans
 * titre par mesure, le passage : chaque paragraphe est rangé seul, comme le
 * font le Comparative Agendas Project et le Manifesto Project avec la
 * quasi-phrase (document 06, section 10 bis).
 */

/** Les candidats dont le programme se range passage par passage. Pilote :
 * Nathalie Arthaud, dont la brochure et le dépliant sont en prose. */
export const PASSAGE_FILING = new Set(['nathalie-arthaud']);

export const CHAPTER = 'chapter';

/**
 * La réponse « aucun sujet » du modèle : une position qui ne vise aucune
 * politique publique (le code 000 du Manifesto Project), ou un texte qui
 * n'est pas une position du candidat. Ce n'est pas un sujet de la grille :
 * un passage ainsi jugé part en relecture, il n'est jamais rangé seul.
 */
export const NO_TOPIC = '0';
/** L'unité d'un passage rangé seul : une par passage. */
export const passageUnit = (position: number) => `passage:${position}`;

/** Un passage fait-il partie d'un rangement ? Rangé passage par passage :
 * s'il est dans sa liste. Sinon : à partir du premier passage du bloc. */
export function inLabel(
  label: { fromPosition: number | null; positions?: number[] },
  position: number | null,
): boolean {
  const p = position ?? 0;
  if (label.positions && label.positions.length > 0)
    return label.positions.includes(p);
  return label.fromPosition === null || p >= label.fromPosition;
}

/**
 * Un passage de vie de campagne, sans position politique : un agenda de
 * meetings, un appel aux dons ou à rejoindre, des adresses et des réseaux.
 * Il n'a pas de sujet et ne se range pas.
 */
export function isCampaignLogistics(quote: string): boolean {
  const q = quote.toLowerCase();
  const signs = [
    /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \d{1,2} \p{L}+,? \d{1,2} ?h(eures)?\b/u,
    /soutenir financièrement|chèque à l’ordre|chèque à l'ordre|faire un don|souscrire en ligne/,
    /rejoignez-nous|participer à la campagne|abonnez-vous|faisons appel à vous|proposons de prendre contact|envie d’adhérer|envie d'adhérer/,
    /\b(instagram|facebook|tiktok|youtube)\b.*@|site officiel de campagne/,
    /agenda détaillé|meetings? (qui auront lieu|de campagne)/,
    // Un appel à rejoindre ou à soutenir la campagne.
    /rejoignez (la|sa|notre) campagne|soutenez-(la|le|nous)\b|aidez-nous à faire connaître/,
  ];
  // Une signature : rien que des noms propres, séparés par des virgules ou
  // « et » (« Nathalie Arthaud, Arlette Laguiller et Jean-Pierre Mercier. »).
  const name = "\\p{Lu}[\\p{L}’'-]+(?: \\p{Lu}[\\p{L}’'-]+)+";
  const signature = new RegExp(`^${name}(?:(?:, | et )${name})*\\.?$`, 'u');
  return signs.some((r) => r.test(q)) || signature.test(quote.trim());
}

/** Le début d'une proposition numérotée : « Proposition 8 - », « Mesure 3 : », « 12. ». */
const NUMBERED =
  /^(?:(?:proposition|mesure|engagement|action|objectif|axe)\s*(?:n°\s*)?\d+\b|\d{1,2}\s*[.)–-]\s+\p{Lu})/iu;

/**
 * Un chapitre fait de propositions numérotées (au moins deux, et au moins
 * la moitié de ses passages) : chaque proposition peut porter un sujet
 * différent, il se range passage par passage. La règle tient à la forme du
 * texte, la même pour tous les candidats.
 */
export function isEnumeratedChapter(quotes: string[]): boolean {
  const numbered = quotes.filter((q) => NUMBERED.test(q.trim())).length;
  return numbered >= 2 && numbered * 2 >= quotes.length;
}

/** Une mesure à l'infinitif : « Stopper », « Renforcer », « Adopter ». */
const INFINITIVE = /^\p{Lu}\p{Ll}+(?:er|ir|re)\b/u;

/**
 * Une liste de mesures : au moins trois passages, dont six sur dix au moins
 * commencent par un verbe à l'infinitif.
 */
export function isMeasureList(quotes: string[]): boolean {
  const verbs = quotes.filter((q) => INFINITIVE.test(q.trim())).length;
  return quotes.length >= 3 && verbs * 10 >= quotes.length * 6;
}

/**
 * Une liste qui change de sujet : parmi ses mesures que le classeur range
 * avec assurance, au moins deux sujets, et le plus fréquent en couvre
 * moins de sept sur dix. Une mesure isolée d'un autre sujet dans une liste
 * cohérente ne suffit pas.
 */
export function spansSeveralTopics(guesses: (string | null)[]): boolean {
  const sure = guesses.filter((g): g is string => g !== null);
  if (sure.length < 2) return false;
  const count = new Map<string, number>();
  for (const g of sure) count.set(g, (count.get(g) ?? 0) + 1);
  const top = Math.max(...count.values());
  return count.size >= 2 && top * 10 < sure.length * 7;
}

/**
 * La suite d'une phrase coupée par une colonne ou une page : elle commence
 * par une minuscule ou une ponctuation de suite (« et la pérennité de
 * l’activité… »).
 */
export function continuesSentence(quote: string): boolean {
  return /^[\p{Ll},;:)»]/u.test(quote.trim());
}
