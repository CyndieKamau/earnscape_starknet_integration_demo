// quick-test.js
// Quick test of wallet APIs with your JWT

const API_URL = 'http://localhost:4000';
const PRIVY_JWT = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlN1UG9jVkhkODBkUm9vZjZmUmM0OGYyQlRjbXZyME92S3loTlJqUjdWQUEifQ.eyJzaWQiOiJjbWh4cHF1aTIwMGdmbGEwY2RuNGY1bzcwIiwiaXNzIjoicHJpdnkuaW8iLCJpYXQiOjE3NjMwNTU1MzYsImF1ZCI6ImNtaGxhcGphczAwNmxqcDBjc3pkbGw0NmkiLCJzdWIiOiJkaWQ6cHJpdnk6Y21obGdubnZtMDFjdGw1MGNlNmJmdWRvMSIsImV4cCI6MTc2MzA1OTEzNn0.OYs_8YrvzZ1wzN_k6QPAIROmw4exjbZVjWGY6Kx2qQWkjlxhmNDTVWcMd5FTCDWJZsgMWwsjgeWhOCkYtUt-hA';

async function testAPI(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${PRIVY_JWT}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`\n🔄 ${method} ${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Status:', response.status);
      console.log('📦 Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Status:', response.status);
      console.log('⚠️  Error:', JSON.stringify(data, null, 2));
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Network error:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing Wallet APIs');
  console.log('=====================');
  console.log('API URL:', API_URL);
  console.log('User ID from JWT: did:privy:cmhlgnnvm01ctl50ce6bfudo1');
  console.log('');

  // Test 1: Get Address
  console.log('📍 TEST 1: Get Wallet Address');
  console.log('This will calculate your Starknet address from Privy user ID');
  const addressResult = await testAPI('GET', '/api/wallet/address');
  
  if (addressResult?.success) {
    console.log('✨ Your Starknet Address:', addressResult.data.address);
    console.log('✨ Is Deployed:', addressResult.data.isDeployed);
  }

  // Test 2: Get Balance
  console.log('\n💰 TEST 2: Get Balance');
  console.log('Checking EARN token balance...');
  const balanceResult = await testAPI('GET', '/api/wallet/balance');
  
  if (balanceResult?.success) {
    console.log('✨ Balance:', balanceResult.data.balance, 'EARN');
    console.log('✨ Balance (wei):', balanceResult.data.balanceWei);
  }

  // Test 3: Get Info
  console.log('\n ℹ️  TEST 3: Get Wallet Info');
  console.log('Getting complete wallet information...');
  const infoResult = await testAPI('GET', '/api/wallet/info');
  
  if (infoResult?.success) {
    console.log('✨ Address:', infoResult.data.address);
    console.log('✨ Deployed:', infoResult.data.isDeployed);
    console.log('✨ Balance:', infoResult.data.balance.formatted, 'EARN');
  }

  // Test 4: Claim Tokens (CAREFUL - this sends real tokens!)
  console.log('\n🎁 TEST 4: Claim Tokens');
  console.log('⚠️  SKIPPING - Uncomment to test actual claim');
  console.log('⚠️  This will send real EARN tokens to your address!');
  
  // Uncomment to test actual claim:
  const claimResult = await testAPI('POST', '/api/wallet/claim', { amount: '1.0' });
  if (claimResult?.success) {
    console.log('✨ Transaction Hash:', claimResult.data.txHash);
    console.log('✨ Amount:', claimResult.data.amount, 'EARN');
  }

  console.log('\n✅ Tests complete!');
  console.log('\n📝 Next steps:');
  console.log('1. If address/balance work, uncomment Test 4 to try claiming');
  console.log('2. Make sure hello-account has EARN tokens in manager contract');
  console.log('3. Verify paymaster is configured correctly');
}

runTests();