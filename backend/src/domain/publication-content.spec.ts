import {
  checkPublicationContent,
  checkPublicationText,
  readPublicationSlug,
} from './publication-content';

const CONTENT = {
  title: 'Accès aux médecins généralistes',
  summary:
    'Les généralistes, leur répartition et leur âge, par commune et par département.',
  sections: [
    {
      title: 'S’installer',
      text: 'Où les médecins exercent, au regard des besoins de soins de la population.',
      indicators: [
        {
          code: 'apl-medecins-generalistes',
          justification:
            'La DREES mesure l’accès aux généralistes par commune.',
        },
      ],
    },
  ],
};

describe('une publication', () => {
  it('tient quand chaque maillon a son texte et ses indicateurs justifiés', () => {
    expect(checkPublicationContent(CONTENT)).toEqual([]);
  });

  it('nomme l’enjeu : un titre ne pose pas de question', () => {
    expect(
      checkPublicationText({
        title: 'Est-ce facile de voir un médecin ?',
        summary: 'x',
      }),
    ).toHaveLength(1);
  });

  it('refuse un maillon vide ou un indicateur sans justification', () => {
    expect(
      checkPublicationContent({
        ...CONTENT,
        sections: [{ title: 'Partir', text: 'x', indicators: [] }],
      }),
    ).toHaveLength(1);
    expect(
      checkPublicationContent({
        ...CONTENT,
        sections: [
          {
            ...CONTENT.sections[0],
            indicators: [{ code: 'apl', justification: ' ' }],
          },
        ],
      }),
    ).toHaveLength(1);
  });

  it('a une adresse publique en minuscules et tirets', () => {
    expect(readPublicationSlug('acces-aux-medecins')).toEqual({
      valid: true,
      slug: 'acces-aux-medecins',
    });
    expect(readPublicationSlug('Accès aux médecins')).toMatchObject({
      valid: false,
    });
  });
});
