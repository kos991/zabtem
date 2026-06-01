declare module 'net-snmp' {
  export const Version2c: number;
  export const Version3: number;

  export enum SecurityLevel {
    noAuthNoPriv = 1,
    authNoPriv = 2,
    authPriv = 3
  }

  export const AuthProtocols: {
    md5: string;
    sha: string;
  };

  export const PrivProtocols: {
    des: string;
    aes: string;
  };

  export interface Options {
    port?: number;
    retries?: number;
    timeout?: number;
    version?: number;
  }

  export interface User {
    name: string;
    level: SecurityLevel;
    authProtocol?: string;
    authKey?: string;
    privProtocol?: string;
    privKey?: string;
  }

  export interface Varbind {
    oid: string;
    value: unknown;
  }

  export interface Session {
    get(
      oids: string[],
      callback: (error: Error | null, varbinds: Varbind[]) => void
    ): void;
    close(): void;
  }

  export function createSession(target: string, community: string, options?: Options): Session;
  export function createV3Session(target: string, user: User, options?: Options): Session;
  export function isVarbindError(varbind: Varbind): boolean;
  export function varbindError(varbind: Varbind): string;

  const defaultExport: {
    Version2c: typeof Version2c;
    Version3: typeof Version3;
    SecurityLevel: typeof SecurityLevel;
    AuthProtocols: typeof AuthProtocols;
    PrivProtocols: typeof PrivProtocols;
    createSession: typeof createSession;
    createV3Session: typeof createV3Session;
    isVarbindError: typeof isVarbindError;
    varbindError: typeof varbindError;
  };

  export default defaultExport;
}
