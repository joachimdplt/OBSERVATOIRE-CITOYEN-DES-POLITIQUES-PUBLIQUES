import { apiClient } from './client'
import type { TeamMember } from '../types/session'

export async function fetchSession(): Promise<TeamMember> {
  const { data } = await apiClient.get<TeamMember>('/admin/session')
  return data
}

export async function signIn(credentials: {
  email: string
  password: string
}): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>(
    '/admin/session',
    credentials,
  )
  return data
}

export async function signOut(): Promise<void> {
  await apiClient.delete('/admin/session')
}
