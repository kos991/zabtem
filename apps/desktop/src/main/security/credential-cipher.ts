type SafeStorageLike = {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(buffer: Buffer): string;
};

export interface CredentialCipher {
  encrypt(value: string): string;
  decrypt(value: string | null): string;
}

export function createCredentialCipher(storage: SafeStorageLike): CredentialCipher {
  return {
    encrypt(value) {
      if (!value) {
        return '';
      }

      if (!storage.isEncryptionAvailable()) {
        return Buffer.from(value, 'utf8').toString('base64');
      }

      return storage.encryptString(value).toString('base64');
    },
    decrypt(value) {
      if (!value) {
        return '';
      }

      const buffer = Buffer.from(value, 'base64');
      if (!storage.isEncryptionAvailable()) {
        return buffer.toString('utf8');
      }

      return storage.decryptString(buffer);
    }
  };
}
