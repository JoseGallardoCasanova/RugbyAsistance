// Mock de expo-crypto para tests
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  digestStringAsync: jest.fn((algorithm, data) => {
    // Simulamos SHA-256 con Node.js crypto
    const crypto = require('crypto');
    return Promise.resolve(
      crypto.createHash('sha256').update(data).digest('hex')
    );
  }),
}));

// Mock de AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock de React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
