// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './brain',
    testMatch: ['smart_cc_ui_verification.js', 'backend_intelligence_verification.js'],
    timeout: 60000,
    use: {
        baseURL: 'http://localhost:8081',
        headless: true,
        viewport: { width: 390, height: 844 }, // iPhone 14 Pro size
        actionTimeout: 15000,
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
});