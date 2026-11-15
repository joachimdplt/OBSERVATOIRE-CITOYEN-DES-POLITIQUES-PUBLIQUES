import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type {
  TopicClassifier,
  TopicSuggestion,
  TopicText,
  UnitText,
} from '../../ports/topic-classifier';

/** Le dossier du classeur Python, à côté du backend. */
const DIR = resolve(
  process.env.CLASSIFIER_DIR ?? `${process.cwd()}/../classifier`,
);

/**
 * Le classeur local (BGE-M3, licence MIT) : un script Python qui compare
 * chaque texte aux définitions des sujets et renvoie les plus proches. Il
 * tourne hors ligne, sur le modèle déjà téléchargé.
 */
@Injectable()
export class BgeTopicClassifier implements TopicClassifier {
  suggest(
    topics: TopicText[],
    units: UnitText[],
    k: number,
  ): Promise<{ model: string; results: TopicSuggestion[] }> {
    return new Promise((done, fail) => {
      const child = spawn(`${DIR}/.venv/bin/python`, [`${DIR}/suggest.py`], {
        env: {
          ...process.env,
          HF_HOME: `${DIR}/.cache`,
          HF_HUB_OFFLINE: '1',
        },
      });
      let out = '';
      let err = '';
      child.stdout.on('data', (d: Buffer) => (out += d.toString()));
      child.stderr.on('data', (d: Buffer) => (err += d.toString()));
      child.on('error', fail);
      child.on('close', (code) => {
        if (code !== 0)
          return fail(
            new Error(`Classeur : ${err.split('\n').slice(-3).join(' ')}`),
          );
        try {
          done(
            JSON.parse(out) as { model: string; results: TopicSuggestion[] },
          );
        } catch (e) {
          fail(e as Error);
        }
      });
      child.stdin.end(JSON.stringify({ topics, units, k }));
    });
  }
}
