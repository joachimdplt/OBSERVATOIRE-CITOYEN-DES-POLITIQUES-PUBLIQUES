import { CAP_FR, readCapCodebook } from './cap';

const PAGE = [
  'CAP Topics',
  'Master Topics Codebook Version 1.1',
  '1. Macroeconomics',
  '100: General',
  'Description: Includes issues related to general domestic macroeconomic policy.',
  '103: Unemployment Rate',
  'Description: Includes issues related to the unemployment rate, impact of unemployment',
  '      See also: 502 training and retraining; 503 unemployment benefits.',
  '3. Health',
  '322: Medical Facilities',
  '  Description: Issues related to facilities construction, regulation',
  'and funding',
  'COMPARATIVE AGENDAS PROJECT',
  '9. Ne pas lire',
].join('\n');

describe('la grille des sujets du Comparative Agendas Project', () => {
  it('lit chaque grand sujet et ses sous-sujets avec leur description officielle', () => {
    expect(readCapCodebook(PAGE)).toEqual([
      {
        code: '1',
        level: 1,
        majorCode: null,
        title: 'Macroeconomics',
        description: null,
      },
      {
        code: '100',
        level: 2,
        majorCode: '1',
        title: 'General',
        description:
          'Includes issues related to general domestic macroeconomic policy.',
      },
      {
        code: '103',
        level: 2,
        majorCode: '1',
        title: 'Unemployment Rate',
        description:
          'Includes issues related to the unemployment rate, impact of unemployment',
      },
      {
        code: '3',
        level: 1,
        majorCode: null,
        title: 'Health',
        description: null,
      },
      {
        code: '322',
        level: 2,
        majorCode: '3',
        title: 'Medical Facilities',
        description:
          'Issues related to facilities construction, regulation and funding',
      },
    ]);
  });

  it('chaque sujet lu a son intitulé français', () => {
    for (const e of readCapCodebook(PAGE)) expect(CAP_FR[e.code]).toBeTruthy();
  });
});
