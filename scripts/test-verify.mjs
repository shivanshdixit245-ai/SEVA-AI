async function testVerify() {
    const bookingId = 'BK-A17A5ED0';
    const otp = '3869';
    console.log(`Testing verification for ${bookingId} with OTP ${otp}...`);
    
    try {
        const res = await fetch('http://localhost:3000/api/bookings/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, otp })
        });
        
        const data = await res.json();
        console.log('Response Status:', res.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testVerify();
