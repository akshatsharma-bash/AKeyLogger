module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-vector-icons|@react-navigation|@react-native-documents|@notifee|@op-engineering|@sayem314|uuid)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/test-utils/'],
};
