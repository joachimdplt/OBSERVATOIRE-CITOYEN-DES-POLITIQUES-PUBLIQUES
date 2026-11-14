import { isAxiosError } from 'axios'

/**
 * Les raisons d'un refus de l'API, telles qu'elle les écrit. L'API renvoie
 * une phrase ou une liste de phrases ; l'écran les montre toutes.
 */
export function reasonsOf(error: unknown): string[] {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data.message
    if (Array.isArray(message)) return message
    if (message) return [message]
    if (!error.response) return ['L’API ne répond pas.']
  }
  return ['Une erreur inattendue est survenue.']
}
