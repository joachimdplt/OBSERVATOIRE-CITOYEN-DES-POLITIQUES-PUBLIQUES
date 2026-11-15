import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/**
 * Les règles du rangement, vérifiées à chaque `npm test`.
 *
 * Dans un seul projet, le compilateur laisse tout passer : une slice qui en
 * appelle une autre, un domaine qui parle à la base. Ces règles ne tiennent
 * que si un test casse au premier écart.
 */

const SRC = __dirname;

/** Chaque fichier TypeScript et ses imports, en chemins relatifs à src/. */
function sources(dir = SRC): { file: string; imports: string[] }[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'generated' ? [] : sources(path);
    }
    if (!name.endsWith('.ts')) return [];
    const text = readFileSync(path, 'utf8');
    const specifiers = [
      ...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g),
    ].map((m) => m[1]);
    return [
      {
        file: rel(path),
        imports: specifiers.map((s) =>
          s.startsWith('.') ? rel(resolve(dirname(path), s)) : s,
        ),
      },
    ];
  });
}

const rel = (path: string) => relative(SRC, path).split(sep).join('/');

/** La slice d'un chemin : `features/imports/validate-import-job`, ou rien. */
function sliceOf(path: string): string | null {
  const parts = path.split('/');
  return parts[0] === 'features' && parts.length >= 4
    ? parts.slice(0, 3).join('/')
    : null;
}

const all = sources();

function violations(
  scope: (file: string) => boolean,
  forbidden: (target: string, file: string) => boolean,
) {
  return all
    .filter(({ file }) => scope(file) && !file.endsWith('.spec.ts'))
    .flatMap(({ file, imports }) =>
      imports
        .filter((target) => forbidden(target, file))
        .map((target) => `${file} importe ${target}`),
    );
}

describe('le rangement par cas d’usage', () => {
  it('une slice n’importe jamais une autre slice', () => {
    expect(
      violations(
        () => true,
        (target, file) => {
          const other = sliceOf(target);
          if (!other || other === sliceOf(file)) return false;
          // Un script en ligne de commande assemble, comme un module.
          if (file.startsWith('scripts/')) return false;
          // La tâche planifiée aussi : elle relance les collecteurs chaque jour.
          if (file.startsWith('jobs/')) return false;
          // Le module d'une ressource enregistre ses slices : c'est son rôle.
          const [, resource] = file.split('/');
          return !(
            file === `features/${resource}/${resource}.module.ts` &&
            other.startsWith(`features/${resource}/`)
          );
        },
      ),
    ).toEqual([]);
  });

  it('features/ ne contient que des ressources, chacune son dossier', () => {
    const loose = readdirSync(join(SRC, 'features')).filter(
      (name) => !statSync(join(SRC, 'features', name)).isDirectory(),
    );
    expect(loose).toEqual([]);
  });

  it('le domaine ne dépend que de lui-même, de Node et des énumérations', () => {
    expect(
      violations(
        (file) => file.startsWith('domain/'),
        (target) =>
          !target.startsWith('domain/') &&
          !target.startsWith('node:') &&
          target !== 'generated/prisma/enums',
      ),
    ).toEqual([]);
  });

  it('un port ne connaît ni ses adapters, ni les slices, ni la base', () => {
    expect(
      violations(
        (file) => file.startsWith('ports/'),
        (target) =>
          target.startsWith('adapters/') ||
          target.startsWith('features/') ||
          target.startsWith('prisma/') ||
          target === 'generated/prisma/client',
      ),
    ).toEqual([]);
  });

  it('une slice passe par un port, jamais par un adapter', () => {
    expect(
      violations(
        (file) => sliceOf(file) !== null,
        (target) => target.startsWith('adapters/'),
      ),
    ).toEqual([]);
  });

  it('l’API publique ne touche jamais aux fichiers bruts ni aux comptes', () => {
    expect(
      violations(
        (file) => file.startsWith('features/public/'),
        (target) => target.startsWith('storage/') || target.startsWith('auth/'),
      ),
    ).toEqual([]);
  });
});
