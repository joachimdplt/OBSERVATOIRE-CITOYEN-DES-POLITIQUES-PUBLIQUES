import { videoCandidates } from './video';

const CANDIDATES = [
  { id: 'jlm', name: 'Jean-Luc Mélenchon' },
  { id: 'ep', name: 'Édouard Philippe' },
  { id: 'mlp', name: 'Marine Le Pen' },
  { id: 'ga', name: 'Gabriel Attal' },
];

describe('les candidats d’une vidéo', () => {
  it('une vidéo de la chaîne d’un candidat est à lui', () => {
    expect(
      videoCandidates(
        'Meeting à Lille',
        { kind: 'candidate', candidateId: 'jlm' },
        CANDIDATES,
      ),
    ).toEqual([{ candidateId: 'jlm', link: 'own_channel' }]);
  });

  it('sur une chaîne d’institution, tout candidat nommé en entier, capitales et accents mis à part', () => {
    expect(
      videoCandidates(
        'JEAN-LUC MELENCHON face à Edouard Philippe : le débat',
        { kind: 'institution', candidateId: null },
        CANDIDATES,
      ).map((f) => f.candidateId),
    ).toEqual(['jlm', 'ep']);
  });

  it('sur la chaîne d’un parti, seulement son candidat, jamais les propos d’un camp sur un autre', () => {
    const renaissance = { kind: 'party' as const, candidateId: 'ga' };
    expect(
      videoCandidates(
        'Propos de Marine Le Pen sur le racisme',
        renaissance,
        CANDIDATES,
      ),
    ).toEqual([]);
    expect(
      videoCandidates(
        'Gabriel Attal répond à Marine Le Pen',
        renaissance,
        CANDIDATES,
      ),
    ).toEqual([{ candidateId: 'ga', link: 'name_in_title' }]);
  });

  it('le nom de famille seul ne rattache pas', () => {
    expect(
      videoCandidates(
        'Philippe Martin et Jean-Marie Le Pen, archives',
        { kind: 'institution', candidateId: null },
        CANDIDATES,
      ),
    ).toEqual([]);
  });
});
