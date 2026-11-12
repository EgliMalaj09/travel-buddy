// Native modules that cannot run inside Jest. MMKV itself switches to its built-in
// in-memory mock when running tests; only its native helper needs a stub.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: jest.fn() },
}));

// expo-crypto's random bytes come from the phone; in tests use Node's.
jest.mock('expo-crypto', () => ({
  getRandomValues: (array: Uint8Array) => require('crypto').getRandomValues(array),
  randomUUID: () => require('crypto').randomUUID(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_algorithm: string, data: string) =>
    require('crypto').createHash('sha256').update(data).digest('hex'),
}));

// The Google and Apple sign-in sheets are native; tests replace them (see socialSignIn.test.ts).
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
    signOut: jest.fn(async () => null),
  },
  isSuccessResponse: (r: { type: string }) => r.type === 'success',
  isErrorWithCode: (e: unknown) => typeof (e as { code?: unknown })?.code === 'string',
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
  },
}));
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

// PowerSync's phone library is native (local SQLite). Tests of the local trip repository use
// Node's own SQLite instead (localTripRepository.test.ts); this stub only lets modules load.
jest.mock('@powersync/react-native', () => {
  class Table {}
  class Schema {}
  class PowerSyncDatabase {
    onChange = jest.fn(() => () => undefined);
    registerListener = jest.fn(() => () => undefined);
    connect = jest.fn(async () => undefined);
    disconnect = jest.fn(async () => undefined);
    disconnectAndClear = jest.fn(async () => undefined);
    getAll = jest.fn(async () => []);
    getCrudBatch = jest.fn(async () => null);
    writeTransaction = jest.fn(async (run: (tx: unknown) => unknown) =>
      run({ execute: jest.fn(async () => undefined), getAll: jest.fn(async () => []) }),
    );
  }
  return {
    Table,
    Schema,
    PowerSyncDatabase,
    column: { text: 'text', integer: 'integer', real: 'real' },
  };
});
