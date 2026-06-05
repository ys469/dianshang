import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: Record<string, unknown> }>();
    const authHeader = request.headers.authorization;
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.replace('Bearer ', '');
    request.user = await this.jwtService.verifyAsync<Record<string, unknown>>(token, {
      secret: process.env.JWT_SECRET ?? 'smart-member-dev-secret'
    });

    if (requiredRoles?.length) {
      const role = String(request.user.role ?? '');
      if (!requiredRoles.includes(role)) {
        throw new ForbiddenException('Insufficient role');
      }
    }

    return true;
  }
}
