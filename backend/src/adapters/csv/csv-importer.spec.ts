import { CsvImporter } from './csv-importer';

const read = async (file: Buffer) => (await new CsvImporter().read(file)).rows;

describe('la lecture d’un CSV', () => {
  it('lit le point-virgule des producteurs français, BOM compris', async () => {
    const file = Buffer.from(
      '﻿code;commune;apl\n01001;L’Abergement-Clémenciat;3,3\n',
      'utf8',
    );
    expect(await read(file)).toEqual([
      ['code', 'commune', 'apl'],
      ['01001', 'L’Abergement-Clémenciat', '3,3'],
    ]);
  });

  it('lit un ancien fichier en Windows-1252 sans perdre les accents', async () => {
    const file = Buffer.from(
      'code;libellé\n2A004;Ajaccio\n13055;Marseille Préfecture\n',
      'latin1',
    );
    expect(await read(file)).toEqual([
      ['code', 'libellé'],
      ['2A004', 'Ajaccio'],
      ['13055', 'Marseille Préfecture'],
    ]);
  });

  it('reconnaît la virgule et la tabulation', async () => {
    expect(await read(Buffer.from('a,b\n1,2\n'))).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(await read(Buffer.from('a\tb\n1\t2\n'))).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('garde les cases telles quelles : zéro de tête, vide, secret statistique', async () => {
    expect(
      await read(Buffer.from('code;valeur\n01001;\n01002;s\n01003;nd\n')),
    ).toEqual([
      ['code', 'valeur'],
      ['01001', ''],
      ['01002', 's'],
      ['01003', 'nd'],
    ]);
  });
});
