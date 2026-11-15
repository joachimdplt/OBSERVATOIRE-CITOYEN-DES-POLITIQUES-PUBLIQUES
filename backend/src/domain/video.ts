import { watchMatch } from './parliament';

/** Un candidat, pour rattacher les vidéos. */
export type VideoCandidate = { id: string; name: string };

/** Une chaîne suivie : celle d'un candidat, de son parti, ou d'une institution. */
export type VideoChannelOwner = {
  kind: 'candidate' | 'party' | 'institution';
  /** Le candidat de la chaîne, ou celui que le parti présente. */
  candidateId: string | null;
};

export type VideoLinkFound = {
  candidateId: string;
  link: 'own_channel' | 'name_in_title';
};

/**
 * Les candidats d'une vidéo, sans jamais rattacher les propos d'un camp sur un
 * autre :
 * - sur la chaîne d'un candidat, la vidéo est à lui ;
 * - sur la chaîne d'un parti, seulement à son candidat, nommé dans le titre ;
 * - sur la chaîne d'une institution, à tout candidat nommé dans le titre.
 *
 * Le nom se lit complet, en mots entiers : le nom de famille seul ne suffit
 * pas (« Philippe » est aussi un prénom, « Le Pen » un autre nom).
 */
export function videoCandidates(
  title: string,
  channel: VideoChannelOwner,
  candidates: VideoCandidate[],
): VideoLinkFound[] {
  if (channel.kind === 'candidate')
    return channel.candidateId
      ? [{ candidateId: channel.candidateId, link: 'own_channel' }]
      : [];
  const named = candidates.filter((c) => watchMatch(title, [c.name]));
  const allowed =
    channel.kind === 'party'
      ? named.filter((c) => c.id === channel.candidateId)
      : named;
  return allowed.map((c) => ({ candidateId: c.id, link: 'name_in_title' }));
}
