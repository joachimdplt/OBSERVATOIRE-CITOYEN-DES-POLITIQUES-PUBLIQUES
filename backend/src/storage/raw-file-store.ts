import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Les fichiers bruts déposés, rangés sous leur empreinte SHA-256. Un même
 * fichier n'est écrit qu'une fois ; aucun n'est jamais remplacé ni servi au
 * public.
 */
@Injectable()
export class RawFileStore {
  constructor(private config: ConfigService) {}

  fingerprint(file: Buffer): string {
    return createHash('sha256').update(file).digest('hex');
  }

  async keep(file: Buffer): Promise<string> {
    const hash = this.fingerprint(file);
    const dir = this.config.getOrThrow<string>('storageDir');
    const path = join(dir, hash);
    await mkdir(dir, { recursive: true });
    try {
      await access(path);
    } catch {
      await writeFile(path, file, { flag: 'wx' });
    }
    return hash;
  }
}
