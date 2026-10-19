import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';

type SigningKeyPurpose = 'admin' | 'investor' | 'user';

interface SigningKeyFile {
  adminSecretKey?: string;
  investorSecretKey?: string;
  userSecretKey?: string;
}

@Injectable()
export class SigningKeyProvider {
  private readonly logger = new Logger(SigningKeyProvider.name);
  private readonly fileSecrets?: SigningKeyFile;

  constructor() {
    if (process.env.SIGNING_KEY_PROVIDER === 'file') {
      const path = process.env.SIGNING_KEY_FILE;
      if (!path) {
        throw new InternalServerErrorException('SIGNING_KEY_FILE is required for file signing keys');
      }
      this.fileSecrets = JSON.parse(readFileSync(path, 'utf8')) as SigningKeyFile;
      this.logger.warn('Loaded signing keys from local file provider; use KMS/HSM for production');
    }
  }

  adminSecret(): string {
    return this.getSecret('admin', 'ADMIN_SECRET_KEY', 'adminSecretKey');
  }

  investorSecret(): string {
    return this.getSecret('investor', 'INVESTOR_SECRET_KEY', 'investorSecretKey');
  }

  userSecret(): string {
    return this.getSecret('user', 'USER_SECRET_KEY', 'userSecretKey');
  }

  private getSecret(
    purpose: SigningKeyPurpose,
    envName: string,
    fileName: keyof SigningKeyFile,
  ): string {
    const value =
      process.env.SIGNING_KEY_PROVIDER === 'file'
        ? this.fileSecrets?.[fileName]
        : process.env[envName];

    if (!value) {
      throw new InternalServerErrorException(`Missing ${purpose} signing key`);
    }
    return value;
  }
}
