// Native modules that cannot run inside Jest. MMKV itself switches to its built-in
// in-memory mock when running tests; only its native helper needs a stub.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: jest.fn() },
}));
