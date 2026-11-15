import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { apiKeyHash, sameKey } from '../domain/api-key';
import { PrismaService } from '../prisma/prisma.service';

/** L'en-tête qui porte la clé. */
export const API_KEY_HEADER = 'x-api-key';

/**
 * L'API publique se lit avec une clé : celle du site, ou une clé donnée par
 * l'équipe à un lecteur nommé. Sans clé valide, rien ne sort.
 */
@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const key = req.header(API_KEY_HEADER) ?? '';
    if (sameKey(key, this.config.get<string>('siteApiKey') ?? ''))
      return next();
    if (key) {
      const found = await this.prisma.apiKey.findUnique({
        where: { keyHash: apiKeyHash(key) },
      });
      if (found && !found.revokedAt) {
        await this.prisma.apiKey.update({
          where: { id: found.id },
          data: { lastUsedAt: new Date() },
        });
        return next();
      }
    }
    res.status(401).json({
      statusCode: 401,
      message:
        'Clé d’API manquante ou invalide : l’API publique se lit avec une clé, à demander à l’équipe, dans l’en-tête X-Api-Key.',
    });
  }
}
