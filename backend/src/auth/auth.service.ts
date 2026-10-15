import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User, UserRole, UserStatus } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './auth.types';
import { toPublicUser } from './public-user.mapper';
import { createSessionToken, hashSessionToken } from './token.util';
import { WechatService } from './wechat.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly wechatService: WechatService,
  ) {}

  async loginWithWechatCode(code: string) {
    const { openId } = await this.wechatService.exchangeCode(code);
    const user = await this.upsertActiveUser(openId);
    return this.issueSession(user);
  }

  async loginWithDevOpenId(wxOpenId: string, displayName?: string) {
    if (!this.config.isDevAuthEnabled()) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Not found.',
      });
    }

    const user = await this.upsertActiveUser(wxOpenId, displayName);
    return this.issueSession(user);
  }

  async logout(sessionId: string) {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return {
      data: {
        success: true,
        note: 'Current session has been revoked server-side.',
      },
    };
  }

  async me(user: AuthenticatedUser) {
    const full = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!full || full.status === UserStatus.DISABLED) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }
    return { data: toPublicUser(full) };
  }

  async authenticateBearerToken(token: string): Promise<AuthenticatedUser> {
    const tokenHash = hashSessionToken(token);
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    if (session.user.status === UserStatus.DISABLED) {
      throw new ForbiddenException({
        code: 'ACCOUNT_DISABLED',
        message: 'Account is disabled.',
      });
    }

    if (session.user.status === UserStatus.DELETING) {
      throw new ForbiddenException({
        code: 'ACCOUNT_DELETING',
        message: 'Account is being deleted.',
      });
    }

    return {
      id: session.user.id,
      role: session.user.role,
      status: session.user.status,
      displayName: session.user.displayName,
      avatarUrl: session.user.avatarUrl,
      sessionId: session.id,
    };
  }

  private async upsertActiveUser(
    wxOpenId: string,
    displayName?: string,
  ): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { wxOpenId },
    });

    if (existing?.status === UserStatus.DISABLED) {
      throw new ForbiddenException({
        code: 'ACCOUNT_DISABLED',
        message: 'Account is disabled.',
      });
    }

    if (existing) {
      if (displayName && displayName !== existing.displayName) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: {
            displayName,
            status:
              existing.status === UserStatus.DELETING
                ? UserStatus.ACTIVE
                : existing.status,
          },
        });
      }
      if (existing.status === UserStatus.DELETING) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { status: UserStatus.ACTIVE },
        });
      }
      return existing;
    }

    return this.prisma.user.create({
      data: {
        wxOpenId,
        displayName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
  }

  private async issueSession(user: User) {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const ttlSeconds = this.config.getOrThrow('AUTH_TOKEN_TTL_SECONDS');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    void session;
    return {
      data: {
        accessToken: token,
        tokenType: 'Bearer',
        expiresAt: expiresAt.toISOString(),
        user: toPublicUser(user),
      },
    };
  }
}
