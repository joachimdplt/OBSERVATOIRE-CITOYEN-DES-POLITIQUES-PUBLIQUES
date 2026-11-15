import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, of, tap } from 'rxjs';

/** Combien de temps une réponse publique se resert telle quelle. */
const TTL_MS = 5 * 60 * 1000;
/** Au plus tant de réponses gardées ; les plus anciennes partent d'abord. */
const MAX_ENTRIES = 2000;

/**
 * La mémoire des réponses publiques. Les données publiques ne changent
 * qu'à la collecte quotidienne et aux décisions de l'équipe : une même page
 * demandée par mille lecteurs se calcule une fois toutes les cinq minutes,
 * pas mille fois. Les navigateurs et un CDN peuvent aussi la garder.
 */
@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, { body: unknown; at: number }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    if (req.method !== 'GET' || !req.originalUrl.startsWith('/api/public/'))
      return next.handle();
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    const key = req.originalUrl;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
      return of(hit.body);
    }
    res.setHeader('X-Cache', 'MISS');
    return next.handle().pipe(
      tap((body) => {
        if (this.cache.size >= MAX_ENTRIES)
          this.cache.delete(this.cache.keys().next().value);
        this.cache.set(key, { body, at: Date.now() });
      }),
    );
  }
}
