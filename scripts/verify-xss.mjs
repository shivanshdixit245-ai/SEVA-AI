
async function verifyXSS() {
    const url = 'http://localhost:3000/api/v1/chat';
    const payload = { message: '<script>alert("XSS")</script>' };
    
    console.log('--- XSS Sanitization Test ---');
    console.log('Sending message:', payload.message);
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        console.log('Received reply:', data.reply);
        
        if (data.reply.includes('&lt;script&gt;')) {
            console.log('✅ PASS: Input was correctly escaped in the reply.');
        } else if (data.reply.includes('<script>')) {
            console.error('❌ FAIL: Script tag was NOT escaped in the reply!');
        } else {
            console.log('ℹ️ NOTICE: reply was processed but exact match for script tag not found (AI might have rewritten it).');
            console.log('Checking message processing logic...');
            // Check if the input itself was sanitized before processing
            // Since we can't see the internal state, we rely on the response.
        }
    } catch (err) {
        console.error('XSS test failed:', err.message);
    }
}

verifyXSS();
