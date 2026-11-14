export type Role = 'editor' | 'reviewer' | 'admin'

export type TeamMember = { id: string; email: string; name: string; role: Role }
