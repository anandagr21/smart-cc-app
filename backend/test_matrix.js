async function testMerchant(query) {
  try {
    const res = await fetch('http://localhost:8000/api/v1/recommendations/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'test_user',
        merchant_name: query,
        amount: 1000,
        payment_mode: 'online',
        intent: 'BALANCED',
        skip_resolution: false
      })
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`Query: "${query}" -> Resolved: "${data.resolved_merchant_name}" (Confidence: ${data.resolution_confidence})`);
    } else {
      console.log(`Query: "${query}" -> API Error ${res.status}`);
    }
  } catch (e) {
    console.log(`Query: "${query}" -> Fetch Error ${e.message}`);
  }
}

async function run() {
  const queries = ['flipcart', 'amazn', 'swigi', 'zomoto', 'fk internet', 'amazon fresh'];
  for (const q of queries) {
    await testMerchant(q);
  }
}

run();
