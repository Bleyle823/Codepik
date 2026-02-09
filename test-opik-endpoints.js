const fetch = require('node-fetch');

async function testEndpoints() {
    const baseUrl = 'http://localhost:3000';

    console.log('Testing Projects Endpoint...');
    try {
        const res = await fetch(`${baseUrl}/api/opik/projects`);
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            console.log('Projects Data:', JSON.stringify(data, null, 2).slice(0, 200) + '...');
        } else {
            console.log('Error:', await res.text());
        }
    } catch (e) { console.error(e); }

    console.log('\nTesting Traces Endpoint...');
    try {
        const res = await fetch(`${baseUrl}/api/opik/traces?size=1`);
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            console.log('Traces Data:', JSON.stringify(data, null, 2).slice(0, 200) + '...');
        } else {
            console.log('Error:', await res.text());
        }
    } catch (e) { console.error(e); }
}

testEndpoints();
