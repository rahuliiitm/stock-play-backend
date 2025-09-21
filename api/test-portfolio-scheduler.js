/**
 * Portfolio Scheduler Test Script
 * 
 * This script demonstrates the portfolio scheduler functionality
 * by simulating the daily sync process and showing the data flow.
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const API_KEY = process.env.GROWW_API_KEY;
const API_SECRET = process.env.GROWW_API_SECRET;

async function testPortfolioScheduler() {
  console.log('🚀 PORTFOLIO SCHEDULER TEST');
  console.log('============================\n');

  try {
    // Step 1: Create a test broker account
    console.log('1️⃣ CREATING BROKER ACCOUNT');
    console.log('---------------------------');
    
    const brokerAccountResponse = await axios.post(`${BASE_URL}/portfolio-scheduler/broker-accounts`, {
      broker_name: 'GROWW',
      account_id: 'test_account_001',
      api_key: API_KEY,
      api_secret: API_SECRET
    }, {
      headers: {
        'Authorization': `Bearer test_token`, // In real app, this would be JWT
        'Content-Type': 'application/json'
      }
    });

    const brokerAccount = brokerAccountResponse.data;
    console.log(`✅ Broker account created: ${brokerAccount.id}`);
    console.log(`   Broker: ${brokerAccount.broker_name}`);
    console.log(`   Account ID: ${brokerAccount.account_id}`);
    console.log(`   Active: ${brokerAccount.is_active}`);
    console.log(`   Token expires: ${brokerAccount.token_expires_at}\n`);

    // Step 2: Test broker account credentials
    console.log('2️⃣ TESTING BROKER CREDENTIALS');
    console.log('------------------------------');
    
    const testResponse = await axios.post(`${BASE_URL}/portfolio-scheduler/broker-accounts/${brokerAccount.id}/test`, {}, {
      headers: {
        'Authorization': `Bearer test_token`,
        'Content-Type': 'application/json'
      },
      params: { userId: 'test_user' }
    });

    const testResult = testResponse.data;
    console.log(`✅ Credentials test: ${testResult.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Message: ${testResult.message}`);
    if (testResult.accountInfo) {
      console.log(`   Holdings count: ${testResult.accountInfo.holdings_count}`);
      console.log(`   Sample holdings:`, testResult.accountInfo.sample_holdings);
    }
    console.log('');

    // Step 3: Trigger manual portfolio sync
    console.log('3️⃣ TRIGGERING MANUAL SYNC');
    console.log('--------------------------');
    
    const syncResponse = await axios.post(`${BASE_URL}/portfolio-scheduler/sync`, {}, {
      headers: {
        'Authorization': `Bearer test_token`,
        'Content-Type': 'application/json'
      },
      params: { userId: 'test_user' }
    });

    console.log(`✅ Manual sync triggered: ${syncResponse.data.message}\n`);

    // Wait a moment for sync to complete
    console.log('⏳ Waiting for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: Get portfolio summary
    console.log('4️⃣ PORTFOLIO SUMMARY');
    console.log('--------------------');
    
    const summaryResponse = await axios.get(`${BASE_URL}/portfolio-scheduler/summary/${brokerAccount.id}`, {
      headers: {
        'Authorization': `Bearer test_token`
      },
      params: { userId: 'test_user' }
    });

    const summary = summaryResponse.data;
    console.log(`✅ Portfolio Summary:`);
    console.log(`   Total Holdings Value: ₹${summary.portfolio.total_holdings_value?.toLocaleString() || 'N/A'}`);
    console.log(`   Total Positions Value: ₹${summary.portfolio.total_positions_value?.toLocaleString() || 'N/A'}`);
    console.log(`   Total Portfolio Value: ₹${summary.portfolio.total_portfolio_value?.toLocaleString() || 'N/A'}`);
    console.log(`   Holdings Count: ${summary.portfolio.holdings_count}`);
    console.log(`   Positions Count: ${summary.portfolio.positions_count}`);
    console.log('');

    // Step 5: Get holdings
    console.log('5️⃣ CURRENT HOLDINGS');
    console.log('--------------------');
    
    const holdingsResponse = await axios.get(`${BASE_URL}/portfolio-scheduler/holdings/${brokerAccount.id}`, {
      headers: {
        'Authorization': `Bearer test_token`
      },
      params: { userId: 'test_user' }
    });

    const holdings = holdingsResponse.data;
    console.log(`✅ Holdings (${holdings.length} stocks):`);
    holdings.slice(0, 5).forEach(holding => {
      console.log(`   ${holding.symbol}: ${holding.quantity} shares @ ₹${holding.average_price} (Current: ₹${holding.current_value?.toLocaleString() || 'N/A'})`);
    });
    if (holdings.length > 5) {
      console.log(`   ... and ${holdings.length - 5} more stocks`);
    }
    console.log('');

    // Step 6: Get order history
    console.log('6️⃣ ORDER HISTORY');
    console.log('----------------');
    
    const ordersResponse = await axios.get(`${BASE_URL}/portfolio-scheduler/orders/${brokerAccount.id}`, {
      headers: {
        'Authorization': `Bearer test_token`
      },
      params: { 
        userId: 'test_user',
        page: 0,
        limit: 5
      }
    });

    const orders = ordersResponse.data;
    console.log(`✅ Recent Orders (${orders.total} total):`);
    orders.orders.forEach(order => {
      console.log(`   ${order.symbol}: ${order.transaction_type} ${order.quantity} @ ₹${order.price || 'Market'} - ${order.order_status}`);
      console.log(`     Order ID: ${order.groww_order_id}`);
      console.log(`     Created: ${new Date(order.created_at).toLocaleString()}`);
    });
    console.log('');

    // Step 7: Get sync history
    console.log('7️⃣ SYNC HISTORY');
    console.log('---------------');
    
    const syncHistoryResponse = await axios.get(`${BASE_URL}/portfolio-scheduler/sync-history/${brokerAccount.id}`, {
      headers: {
        'Authorization': `Bearer test_token`
      },
      params: { 
        userId: 'test_user',
        page: 0,
        limit: 3
      }
    });

    const syncHistory = syncHistoryResponse.data;
    console.log(`✅ Sync History (${syncHistory.total} batches):`);
    syncHistory.batches.forEach(batch => {
      console.log(`   ${batch.sync_type}: ${batch.status} - ${new Date(batch.started_at).toLocaleString()}`);
      console.log(`     Holdings: ${batch.holdings_fetched} fetched, ${batch.holdings_updated} updated`);
      console.log(`     Orders: ${batch.orders_fetched} fetched, ${batch.orders_created} created`);
      console.log(`     Changes: ${batch.quantity_changes_detected} detected`);
      if (batch.errors_count > 0) {
        console.log(`     Errors: ${batch.errors_count}`);
      }
    });
    console.log('');

    // Step 8: Get portfolio snapshots
    console.log('8️⃣ PORTFOLIO SNAPSHOTS');
    console.log('----------------------');
    
    const snapshotsResponse = await axios.get(`${BASE_URL}/portfolio-scheduler/snapshots/${brokerAccount.id}`, {
      headers: {
        'Authorization': `Bearer test_token`
      },
      params: { 
        userId: 'test_user',
        days: 7
      }
    });

    const snapshots = snapshotsResponse.data;
    console.log(`✅ Portfolio Snapshots (${snapshots.length} days):`);
    snapshots.forEach(snapshot => {
      const changePercent = snapshot.day_change_percent ? `${snapshot.day_change_percent > 0 ? '+' : ''}${snapshot.day_change_percent.toFixed(2)}%` : 'N/A';
      console.log(`   ${snapshot.snapshot_date}: ₹${snapshot.total_portfolio_value?.toLocaleString() || 'N/A'} (${changePercent})`);
    });
    console.log('');

    // Step 9: Summary
    console.log('9️⃣ TEST SUMMARY');
    console.log('---------------');
    console.log('✅ Portfolio Scheduler Test Completed Successfully!');
    console.log('');
    console.log('🎯 Key Features Demonstrated:');
    console.log('   • Broker account creation and management');
    console.log('   • Credential validation and testing');
    console.log('   • Manual portfolio sync triggering');
    console.log('   • Real-time holdings and positions data');
    console.log('   • Order history tracking');
    console.log('   • Sync batch monitoring');
    console.log('   • Portfolio snapshot generation');
    console.log('');
    console.log('🚀 System is ready for:');
    console.log('   • Daily automated sync at 4:00 PM IST');
    console.log('   • Immutable order history tracking');
    console.log('   • Portfolio performance analysis');
    console.log('   • Risk management and compliance');
    console.log('   • Multi-account portfolio management');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: This test requires authentication. In a real application,');
      console.log('   you would need to login first and use a valid JWT token.');
    }
  }
}

// Run the test
testPortfolioScheduler().catch(console.error);
