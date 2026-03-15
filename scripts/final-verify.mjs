async function verifyData() {
    console.log('🧐 Final Verification: Fetching bookings for "load-test-user"...');
    
    try {
        const res = await fetch('http://localhost:3000/api/v1/bookings?userId=load-test-user');
        const data = await res.json();
        
        console.log(`\n--- Verification Results ---`);
        console.log(`Expected: 20`);
        console.log(`Found:    ${data.length}`);
        
        if (data.length >= 20) {
            console.log('\n✅ VERIFICATION SUCCESS: Data correctly persisted and retrieved via API.');
            // Show a sample to prove it's real
            console.log('Sample Booking ID:', data[0].id);
        } else {
            console.error('\n❌ VERIFICATION FAILED: Data mismatch.');
        }
    } catch (err) {
        console.error('Verification Error:', err.message);
    }
}

verifyData();
