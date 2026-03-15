
async function testRateLimit() {
    const url = 'http://localhost:3000/api/v1/chat';
    console.log(`Starting rate limit test on ${url}...`);
    
    for (let i = 1; i <= 10; i++) {
        try {
            const start = Date.now();
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Rate limit test ' + i })
            });
            const duration = Date.now() - start;
            console.log(`Request ${i}: Status ${res.status} (${duration}ms)`);
            
            if (res.status === 429) {
                const data = await res.json();
                console.log('SUCCESS: Rate limit triggered!', data);
                return;
            }
        } catch (err) {
            console.error(`Request ${i} failed:`, err.message);
        }
    }
    console.log('FAILURE: Rate limit NOT triggered after 10 requests.');
}

testRateLimit();
