import { Injectable } from '@nestjs/common';
import { isFreeLicence, plainCredit, type FreePhoto } from '../../domain/photo';
import type { PhotoSource } from '../../ports/photo-source';

/** Un nom de client générique, comme le demandent les règles de Wikimedia. */
const HEADERS = { 'User-Agent': 'observatoire-citoyen/0.1 (logiciel libre)' };

/** La largeur de la vignette demandée à Commons. */
const WIDTH = 480;

type Entity = {
  entities: Record<
    string,
    { claims?: { P18?: { mainsnak: { datavalue?: { value: string } } }[] } }
  >;
};
type ImageInfo = {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: {
          thumburl?: string;
          descriptionurl: string;
          extmetadata?: Record<string, { value: string } | undefined>;
        }[];
      }
    >;
  };
};

/**
 * La photo principale d'un élément Wikidata (propriété P18), et son auteur et
 * sa licence lus sur Wikimedia Commons. Les requêtes sont espacées : Wikidata
 * limite les clients pressés.
 */
@Injectable()
export class WikimediaPhotos implements PhotoSource {
  async photoOf(wikidataId: string): Promise<FreePhoto | null> {
    const entity = await this.get<Entity>(
      `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wikidataId)}.json`,
    );
    const file =
      entity.entities[wikidataId]?.claims?.P18?.[0]?.mainsnak.datavalue?.value;
    if (!file) return null;
    const info = await this.get<ImageInfo>(
      'https://commons.wikimedia.org/w/api.php?' +
        new URLSearchParams({
          action: 'query',
          titles: `File:${file}`,
          prop: 'imageinfo',
          iiprop: 'url|extmetadata',
          iiurlwidth: String(WIDTH),
          format: 'json',
        }).toString(),
    );
    const image = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0];
    const meta = image?.extmetadata ?? {};
    const licence = meta.LicenseShortName?.value ?? '';
    if (!image?.thumburl || !isFreeLicence(licence)) return null;
    return {
      url: image.thumburl,
      author: plainCredit(
        meta.Artist?.value ?? meta.Credit?.value ?? 'Auteur inconnu',
      ),
      licence,
      licenceUrl: meta.LicenseUrl?.value ?? null,
      page: image.descriptionurl,
    };
  }

  private async get<T>(url: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429 && attempt < 4) {
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} sur ${url}`);
      return (await res.json()) as T;
    }
  }
}
