import type { Network } from '../domain/accounts';

/** Un compte public relevé pour une personne. */
export type FoundAccount = { network: Network; handle: string };

/**
 * Les comptes publics d'une personne d'après une source de référence (son
 * élément Wikidata) : chaîne YouTube, Instagram, X, TikTok.
 */
export interface AccountSource {
  accountsOf(wikidataId: string): Promise<FoundAccount[]>;
}

export const ACCOUNT_SOURCE = Symbol('ACCOUNT_SOURCE');

/** Les comptes publics liés depuis un site officiel (ses liens de pied de page). */
export interface SiteAccountSource {
  accountsOnSite(url: string): Promise<FoundAccount[]>;
}

export const SITE_ACCOUNT_SOURCE = Symbol('SITE_ACCOUNT_SOURCE');
