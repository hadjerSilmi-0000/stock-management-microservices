export default {
    testEnvironment: "node",
    transform: {},
    testMatch: ["**/__tests__/**/*.test.js"],
    testTimeout: 30000,
    forceExit: true,
    clearMocks: true,
    moduleDirectories: ["node_modules", "."],
    moduleNameMapper: {
        "^(\\.\\./)+(shared/.*)$": "<rootDir>/$1"
    },
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
};