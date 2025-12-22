/**
 * K6 Test Runner - Run All Tests
 * Usage: k6 run test/run-all.test.js
 */

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Import all test modules
import authTests from './auth.test.js';
import adminTests from './admin.test.js';
import studentTests from './student.test.js';
import teachingTests from './teaching.test.js';

export const options = {
    scenarios: {
        auth: {
            executor: 'shared-iterations',
            vus: 1,
            iterations: 1,
            exec: 'authTestScenario',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],
        checks: ['rate>0.7'],
    },
};

export function authTestScenario() {
    authTests();
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
        'test/md/combined-test-report.md': generateCombinedReport(data),
    };
}

function generateCombinedReport(data) {
    const metrics = data.metrics;
    const now = new Date().toISOString();

    let report = `# Combined API Test Report\n\n`;
    report += `**Generated:** ${now}\n\n`;

    report += `## Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Requests | ${metrics.http_reqs?.values?.count || 0} |\n`;
    report += `| Avg Response Time | ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms |\n`;
    report += `| P95 Response Time | ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms |\n`;
    report += `| Checks Passed | ${metrics.checks?.values?.passes || 0} |\n`;
    report += `| Checks Failed | ${metrics.checks?.values?.fails || 0} |\n`;

    return report;
}
