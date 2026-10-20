/**
 * ARGUS MUTATION TESTING HARNESS (mutationCheck.js)
 * 
 * Purpose:
 * Directly tests the integrity of the test suite against intentional vulnerabilities.
 * "If a developer introduces an authorization bypass or breaks default-deny, will our tests fail?"
 * 
 * Mutations Tested:
 * 1. Default-Allow Bypass: Changing authorize() to return allowed when no grant exists.
 * 2. Admin Superuser Bypass: Granting Admin blanket document download access.
 * 3. Existence Enumeration Leak: Returning 403 instead of 404 on ungranted files.
 * 4. Grantee Escalation Bypass: Permitting read-only grantees to edit documents.
 * 5. Hash Chain Verification Bypass: Disabling prev_hash or row_hash check in audit verification.
 * 
 * Target: 100% Mutation Kill Rate (All mutants must be caught and killed by the test suite).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const TARGET_FILES = {
    authz: path.resolve('server/src/services/authzService.js'),
    audit: path.resolve('server/src/services/auditService.js')
};

const MUTATIONS = [
    {
        name: 'MUTATION 1: Default-Allow Bypass (Allow ungranted viewer)',
        file: TARGET_FILES.authz,
        original: 'const err = new Error(\'Document not found.\');\n        err.status = 404;\n        throw err;',
        mutated: 'return { authorized: true, role: \'read\', document };',
        expectedFailedTest: 'Matrix 2, Matrix 4, or Anti-IDOR'
    },
    {
        name: 'MUTATION 2: Admin Superuser Bypass (Blanket content access to Admin)',
        file: TARGET_FILES.authz,
        original: 'if (document.owner_id === user.id) {',
        mutated: 'if (document.owner_id === user.id || user.role === \'admin\') {',
        expectedFailedTest: 'LEAST PRIVILEGE ADMIN / Matrix 3'
    },
    {
        name: 'MUTATION 3: Existence Enumeration Leak (Return 403 instead of 404)',
        file: TARGET_FILES.authz,
        original: 'err.status = 404;\n        throw err;',
        mutated: 'err.status = 403;\n        throw err;',
        expectedFailedTest: 'Anti-IDOR / Matrix 2 / Matrix 4'
    },
    {
        name: 'MUTATION 4: Grantee Escalation Bypass (Permit read-only to edit)',
        file: TARGET_FILES.authz,
        original: 'if (action === \'edit\' && grant.permission !== \'edit\') {',
        mutated: 'if (false && action === \'edit\' && grant.permission !== \'edit\') {',
        expectedFailedTest: 'Matrix 5 (Read-only grantee cannot edit)'
    },
    {
        name: 'MUTATION 5: Hash Chain Verification Bypass (Skip hash recomputation)',
        file: TARGET_FILES.audit,
        original: 'if (recomputedHash !== row.row_hash) {',
        mutated: 'if (false && recomputedHash !== row.row_hash) {',
        expectedFailedTest: 'TAMPER DETECTION (Modifying historical row)'
    }
];

async function runMutationTests() {
    console.log('🛡️ [Argus Mutation Testing Engine] Beginning mutation analysis...');
    console.log(`📋 Total Mutants to Introduce: ${MUTATIONS.length}\n`);

    let killedCount = 0;
    const results = [];

    for (let i = 0; i < MUTATIONS.length; i++) {
        const m = MUTATIONS[i];
        console.log(`\n========================================================================`);
        console.log(`[Mutant ${i + 1}/${MUTATIONS.length}] Injecting: ${m.name}`);
        console.log(`File: ${path.basename(m.file)}`);

        const originalContent = fs.readFileSync(m.file, 'utf8');

        if (!originalContent.includes(m.original)) {
            console.error(`❌ Mutation target string not found in ${m.file}! Skipping.`);
            results.push({ name: m.name, status: 'SKIPPED (Target not found)' });
            continue;
        }

        try {
            // 1. Inject mutant
            const mutatedContent = originalContent.replace(m.original, m.mutated);
            fs.writeFileSync(m.file, mutatedContent, 'utf8');

            // 2. Run test suite to see if mutant is detected (test must fail)
            let testPassed = false;
            try {
                execSync('npx vitest run --silent', { stdio: 'pipe' });
                testPassed = true;
            } catch (_) {
                // Test suite failed -> Mutant successfully killed!
                testPassed = false;
            }

            if (!testPassed) {
                console.log(`✅ KILLED: Test suite failed as expected! Mutant was caught.`);
                killedCount++;
                results.push({ name: m.name, status: 'KILLED' });
            } else {
                console.error(`🚨 SURVIVED: Test suite PASSED despite vulnerability injection!`);
                results.push({ name: m.name, status: 'SURVIVED' });
            }
        } finally {
            // 3. Always restore original file
            fs.writeFileSync(m.file, originalContent, 'utf8');
        }
    }

    console.log(`\n========================================================================`);
    console.log(`📊 [Argus Mutation Testing Report Summary]`);
    console.log(`Mutants Tested: ${MUTATIONS.length}`);
    console.log(`Mutants Killed: ${killedCount}`);
    console.log(`Mutants Survived: ${MUTATIONS.length - killedCount}`);
    const killRate = ((killedCount / MUTATIONS.length) * 100).toFixed(1);
    console.log(`Mutation Kill Rate: ${killRate}%`);

    results.forEach((r, idx) => {
        console.log(`  ${idx + 1}. [${r.status}] ${r.name}`);
    });

    if (killedCount === MUTATIONS.length) {
        console.log(`\n🎯 SUCCESS: 100% Mutation Kill Rate achieved! Every authorization bypass is caught.`);
        process.exit(0);
    } else {
        console.error(`\n❌ FAILURE: Some mutants survived. Strengthen test assertions.`);
        process.exit(1);
    }
}

runMutationTests();
