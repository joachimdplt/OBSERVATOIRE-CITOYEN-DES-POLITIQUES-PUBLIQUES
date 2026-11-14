import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '../generated/prisma/enums';

export type TeamMember = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TeamMember =>
    ctx.switchToHttp().getRequest<{ user: TeamMember }>().user,
);
