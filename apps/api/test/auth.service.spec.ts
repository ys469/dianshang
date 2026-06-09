import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthService.resetPassword', () => {
  const authDbService = {
    findByMobile: vi.fn(),
    updatePassword: vi.fn()
  };
  const jwtService = {
    sign: vi.fn()
  };
  const runtimeDataService = {
    ensureMemberProfile: vi.fn()
  };
  const mailSenderService = {
    sendPasswordReset: vi.fn()
  };
  const smsCodeStoreService = {
    getCodeExpiresSeconds: vi.fn(),
    saveCode: vi.fn(),
    verifyCode: vi.fn()
  };
  const smsSenderService = {
    sendCode: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rolls the password hash back when email delivery fails', async () => {
    authDbService.findByMobile.mockResolvedValue({
      id: 'user-001',
      role: 'user',
      account: '13900000011',
      mobile: '13900000011',
      email: 'member11@example.com',
      nickname: '测试会员',
      memberLevel: '普通会员',
      passwordHash: 'old-password-hash',
      createdAt: new Date().toISOString()
    });
    mailSenderService.sendPasswordReset.mockRejectedValue(new Error('smtp failed'));

    const service = new AuthService(
      authDbService as never,
      jwtService as never,
      runtimeDataService as never,
      mailSenderService as never,
      smsCodeStoreService as never,
      smsSenderService as never
    );

    await expect(
      service.resetPassword({
        mobile: '13900000011',
        email: 'member11@example.com'
      })
    ).rejects.toThrow('smtp failed');

    expect(authDbService.updatePassword).toHaveBeenCalledTimes(2);
    expect(authDbService.updatePassword.mock.calls[0][0]).toBe('user-001');
    expect(authDbService.updatePassword.mock.calls[0][1]).not.toBe('old-password-hash');
    expect(authDbService.updatePassword.mock.calls[1]).toEqual([
      'user-001',
      'old-password-hash'
    ]);
  });
});
