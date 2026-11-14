import axios from 'axios'

/**
 * Le seul client HTTP de l'administration. L'API est sur la même origine
 * (`/api`) : le cookie de session part avec chaque requête, sans jeton à
 * garder dans le navigateur.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
})
