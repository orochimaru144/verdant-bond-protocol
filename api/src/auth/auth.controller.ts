import {
  Controller, Get, Post, Body, Req,
  HttpCode, HttpStatus, UseGuards, Param, NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { KycService } from './kyc.service';
import { ChallengeDto } from './dto/challenge.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { KycAuditEntry, KycRecord, KycStatus, KycStatusSource } from '../common/interfaces/authenticated-request.interface';
import {
  ChallengeResponse,
  AuthTokenResponse,
  UserProfileResponse,
} from './interfaces/auth.interface';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

interface UpdateKycBody {
  status: KycStatus;
  source?: KycStatusSource;
  actor?: string | null;
  reason?: string | null;
  providerReference?: string | null;
  expiresAt?: number | null;
}

interface KycProfileResponse extends UserProfileResponse {
  kyc: KycRecord;
  audit: KycAuditEntry[];
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly kycService: KycService,
  ) {}

  @Post('challenge')
  @RateLimit({ type: 'auth' })
  @HttpCode(HttpStatus.OK)
  async challenge(@Body() dto: ChallengeDto): Promise<ChallengeResponse> {
    return this.authService.generateChallenge(dto.address);
  }

  @Post('verify')
  @RateLimit({ type: 'auth' })
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifySignatureDto): Promise<AuthTokenResponse> {
    return this.authService.verifySignature(dto);
  }

  @Post('refresh')
  @RateLimit({ type: 'auth' })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@Req() req: AuthenticatedRequest): Promise<KycProfileResponse> {
    const base = await this.authService.getProfile(req.user.walletAddress);
    const kyc = await this.kycService.getFullStatus(req.user.walletAddress);
    const audit = await this.kycService.listAudit(req.user.walletAddress, 50);
    return { ...base, kyc, audit };
  }

  @Get('kyc/:address')
  @UseGuards(JwtAuthGuard)
  async getKyc(@Param('address') address: string): Promise<{ record: KycRecord; audit: KycAuditEntry[] }> {
    const record = await this.kycService.getFullStatus(address);
    if (!record) throw new NotFoundException('No KYC record found for this address');
    const audit = await this.kycService.listAudit(address, 100);
    return { record, audit };
  }

  @Post('kyc/:address')
  @UseGuards(JwtAuthGuard)
  async updateKyc(
    @Param('address') address: string,
    @Body() body: UpdateKycBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ record: KycRecord; entry: KycAuditEntry; isNew: boolean }> {
    const actor = body.actor ?? req.user.walletAddress;
    return this.kycService.transitionStatus(address, body.status, {
      source: body.source ?? 'admin',
      actor,
      reason: body.reason ?? null,
      providerReference: body.providerReference ?? null,
      expiresAt: body.expiresAt ?? null,
    });
  }
}
