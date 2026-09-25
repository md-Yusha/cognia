module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo-secure-store$': '<rootDir>/test/__mocks__/expo-secure-store.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/test/__mocks__/async-storage.ts',
    '^expo-web-browser$': '<rootDir>/test/__mocks__/expo-web-browser.ts',
    '^expo-auth-session$': '<rootDir>/test/__mocks__/expo-auth-session.ts',
    '^expo-clipboard$': '<rootDir>/test/__mocks__/expo-clipboard.ts',
    '^firebase/(.*)$': '<rootDir>/test/__mocks__/firebase.ts',
    '^react-native$': '<rootDir>/test/__mocks__/react-native.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      tsconfig: { 
        jsx: 'react',
        types: ['jest', 'node'],
        rootDir: '.',
        skipLibCheck: true,
      } 
    }],
  },
};
