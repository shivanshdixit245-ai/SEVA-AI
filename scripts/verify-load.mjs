const API_BASE = 'http://localhost:3000/api/v1';
const CONCURRENT_REQUESTS = 20;

async function testLoad() {
    console.log(`🚀 Starting production readiness load test (${CONCURRENT_REQUESTS} concurrent requests)...`);
    
    const startTime = Date.now();
    const requests = Array.from({ length: CONCURRENT_REQUESTS }).map(async (_, i) => {
        try {
            const res = await fetch(`${API_BASE}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'load-test-user',
                    serviceType: 'Deep Cleaning',
                    description: `Load test request #${i}`,
                    location: 'Test City'
                })
            });
            const data = await res.json();
            return { success: res.ok, status: res.status, id: data.id };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;

    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;

    console.log('\n--- Load Test Results ---');
    console.log(`Total Requests: ${CONCURRENT_REQUESTS}`);
    console.log(`Successes:      ${successes}`);
    console.log(`Failures:       ${failures}`);
    console.log(`Duration:       ${duration}ms`);
    console.log(`Avg Response:   ${Math.round(duration / CONCURRENT_REQUESTS)}ms`);

    if (failures > 0) {
        console.error('\n❌ LOAD TEST FAILED: Some requests did not finish successfully.');
    } else {
        console.log('\n✅ LOAD TEST PASSED: All requests successfully processed.');
    }
}

testLoad();
