import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SigningKeyProvider } from './signing-key.provider';

describe('SigningKeyProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads signing keys from the default environment provider', () => {
    process.env.ADMIN_SECRET_KEY = 'SADMIN';
    process.env.INVESTOR_SECRET_KEY = 'SINVESTOR';

    const provider = new SigningKeyProvider();

    expect(provider.adminSecret()).toBe('SADMIN');
    expect(provider.investorSecret()).toBe('SINVESTOR');
  });

  it('can be swapped to the local file provider without changing call sites', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verdant-keys-'));
    const file = join(dir, 'keys.json');
    writeFileSync(
      file,
      JSON.stringify({
        adminSecretKey: 'SFILEADMIN',
        investorSecretKey: 'SFILEINVESTOR',
      }),
    );
    process.env.SIGNING_KEY_PROVIDER = 'file';
    process.env.SIGNING_KEY_FILE = file;

    try {
      const provider = new SigningKeyProvider();
      expect(provider.adminSecret()).toBe('SFILEADMIN');
      expect(provider.investorSecret()).toBe('SFILEINVESTOR');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
