import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KycService } from './kyc.service';
import { buildControllerApp } from '../test/controller-guard.harness';
import { autoMock, TestRole } from '../test/guard-role-mocks';

describe('AuthController authorization (behavioral)', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthService>;
  let kycService: jest.Mocked<KycService>;

  const mockAuthService = autoMock(AuthService);
  const mockKycService = autoMock(KycService);

  beforeAll(async () => {
    app = await buildControllerApp(AuthController, [
      { provide: AuthService, useValue: mockAuthService },
      { provide: KycService, useValue: mockKycService },
    ]);
    authService = app.get(AuthService) as jest.Mocked<AuthService>;
    kycService = app.get(KycService) as jest.Mocked<KycService>;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('public auth endpoints', () => {
    it('POST /auth/challenge is reachable without a session', async () => {
      mockAuthService.generateChallenge.mockResolvedValue({ challenge: 'c' } as any);
      await request(app.getHttpServer())
        .post('/auth/challenge')
        .set('x-test-role', 'anon' as TestRole)
        .send({ address: 'G_X' })
        .expect(200);
      expect(authService.generateChallenge).toHaveBeenCalled();
    });

    it('POST /auth/verify is reachable without a session', async () => {
      mockAuthService.verifySignature.mockResolvedValue({ token: 't' } as any);
      await request(app.getHttpServer())
        .post('/auth/verify')
        .set('x-test-role', 'anon' as TestRole)
        .send({ address: 'G_X', signature: 's', challenge: 'c' })
        .expect(200);
      expect(authService.verifySignature).toHaveBeenCalled();
    });
  });

  describe('authenticated profile endpoints', () => {
    it('GET /auth/profile rejects anonymous callers', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('x-test-role', 'anon' as TestRole)
        .expect(401);
      expect(authService.getProfile).not.toHaveBeenCalled();
    });

    it('GET /auth/kyc/:address rejects anonymous callers', async () => {
      await request(app.getHttpServer())
        .get('/auth/kyc/G_X')
        .set('x-test-role', 'anon' as TestRole)
        .expect(401);
      expect(kycService.getFullStatus).not.toHaveBeenCalled();
    });

    it('POST /auth/kyc/:address rejects anonymous callers', async () => {
      await request(app.getHttpServer())
        .post('/auth/kyc/G_X')
        .set('x-test-role', 'anon' as TestRole)
        .send({ status: 'verified' })
        .expect(401);
      expect(kycService.transitionStatus).not.toHaveBeenCalled();
    });

    it('allows authenticated callers through to the service', async () => {
      mockAuthService.getProfile.mockResolvedValue({ walletAddress: 'G_USER_ADDRESS' } as any);
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('x-test-role', 'user' as TestRole)
        .expect(200);
      expect(authService.getProfile).toHaveBeenCalledWith('G_USER_ADDRESS');
    });
  });
});
