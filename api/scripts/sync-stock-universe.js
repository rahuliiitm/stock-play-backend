#!/usr/bin/env node

/**
 * Stock Universe Sync Script
 * This script syncs stock symbols from NSE and BSE
 */

const { Client } = require('pg');
const axios = require('axios');

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'rjain',
  password: '',
  database: 'stockplay'
};

// NSE and BSE URLs
const NSE_URL = 'https://archives.nseindia.com/content/equities/EQUITY_L.csv';
const BSE_URL = ''; // BSE URL would be configured here

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.split(',').map((p) => p.replace(/^"|"$/g, '').trim()));
}

async function syncNseData(client) {
  console.log('🔄 Syncing NSE data...');
  
  try {
    const { data } = await axios.get(NSE_URL, {
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const rows = parseCsv(data);
    if (rows.length === 0) {
      console.log('❌ No NSE data found');
      return 0;
    }
    
    const header = rows[0].map((h) => h.toUpperCase());
    const batchAt = new Date();
    let inserted = 0;
    
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const get = (name) => {
        const idx = header.indexOf(name);
        return idx >= 0 ? r[idx] : '';
      };
      
      const symbol = (get('SYMBOL') || r[0] || '').toUpperCase();
      if (!symbol || symbol === 'SYMBOL') continue;
      
      const name = get('NAME OF COMPANY') || get('NAME') || null;
      const series = get('SERIES') || null;
      const isin = get('ISIN') || get('ISIN NUMBER') || null;
      const lot = get('MARKET LOT') || get('LOT SIZE') || '';
      const face = get('FACE VALUE') || '';
      
      await client.query(`
        INSERT INTO stock_symbols (symbol, name, exchange, status, series, isin, lot_size, face_value, last_seen_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (symbol, exchange) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          series = EXCLUDED.series,
          isin = EXCLUDED.isin,
          lot_size = EXCLUDED.lot_size,
          face_value = EXCLUDED.face_value,
          status = EXCLUDED.status,
          last_seen_at = EXCLUDED.last_seen_at,
          updated_at = EXCLUDED.updated_at
      `, [
        symbol,
        name,
        'NSE',
        'active',
        series,
        isin,
        lot ? Number(lot) : null,
        face || null,
        batchAt,
        batchAt,
        batchAt
      ]);
      
      inserted++;
    }
    
    // Mark inactive symbols
    await client.query(`
      UPDATE stock_symbols 
      SET status = 'inactive' 
      WHERE exchange = 'NSE' 
      AND (last_seen_at IS NULL OR last_seen_at < $1)
    `, [batchAt]);
    
    console.log(`✅ NSE sync completed: ${inserted} symbols processed`);
    return inserted;
    
  } catch (error) {
    console.error('❌ NSE sync failed:', error.message);
    throw error;
  }
}

async function syncStockUniverse() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔄 Starting stock universe sync...');
    
    // Connect to database
    await client.connect();
    console.log('✅ Database connected');
    
    // Clear existing data
    await client.query('DELETE FROM stock_symbols');
    console.log('🗑️  Cleared existing stock symbols');
    
    // Sync NSE data
    const nseCount = await syncNseData(client);
    
    // Get final counts
    const countResult = await client.query('SELECT COUNT(*) FROM stock_symbols');
    const nseResult = await client.query("SELECT COUNT(*) FROM stock_symbols WHERE exchange = 'NSE'");
    const bseResult = await client.query("SELECT COUNT(*) FROM stock_symbols WHERE exchange = 'BSE'");
    
    console.log('📊 Final counts:');
    console.log(`  - Total: ${countResult.rows[0].count}`);
    console.log(`  - NSE: ${nseResult.rows[0].count}`);
    console.log(`  - BSE: ${bseResult.rows[0].count}`);
    
    // Test search functionality
    const searchResults = await client.query(
      'SELECT symbol, name, exchange FROM stock_symbols WHERE symbol ILIKE $1 LIMIT 5',
      ['%RELIANCE%']
    );
    
    console.log('🔍 Search test results:');
    searchResults.rows.forEach(stock => {
      console.log(`  - ${stock.symbol}: ${stock.name} (${stock.exchange})`);
    });
    
    console.log('🎉 Stock universe sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error syncing stock universe:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  syncStockUniverse();
}

module.exports = { syncStockUniverse };




