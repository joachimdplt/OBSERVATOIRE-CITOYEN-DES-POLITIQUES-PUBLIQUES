import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import type { Category } from '../../domain/category';

/** Une catégorie telle que l'équipe la déclare. */
export class CategoryDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() label!: string;
  @IsOptional() @IsString() explanation?: string;
  /** Les autres codes du même sens dans les fichiers : « 1_ZIP » pour « ZIP ». */
  @IsOptional() @IsArray() @IsString({ each: true }) aliases?: string[];
  /** Par code de région : le libellé ou l'explication propre à la région. */
  @IsOptional()
  @IsObject()
  regions?: Record<string, { label?: string; explanation?: string }>;
}

/** La catégorie rangée telle qu'elle s'enregistre : sans espaces ni champ vide. */
export function cleanCategory(c: CategoryDto): Category {
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const regions = Object.entries(c.regions ?? {}).map(
    ([code, r]) =>
      [
        code.trim(),
        {
          ...(text(r?.label) ? { label: text(r.label) } : {}),
          ...(text(r?.explanation) ? { explanation: text(r.explanation) } : {}),
        },
      ] as const,
  );
  return {
    code: c.code.trim(),
    label: c.label.trim(),
    ...(text(c.explanation) ? { explanation: text(c.explanation) } : {}),
    ...(c.aliases?.length ? { aliases: c.aliases.map((a) => a.trim()) } : {}),
    ...(regions.length ? { regions: Object.fromEntries(regions) } : {}),
  };
}
