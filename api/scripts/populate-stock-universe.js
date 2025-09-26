#!/usr/bin/env node

/**
 * Stock Universe Population Script
 * This script populates the stock_symbols table with NSE and BSE data
 */

const { Client } = require('pg');

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'rjain',
  password: '',
  database: 'stockplay'
};

// Stock symbol data structure
const StockSymbol = {
  symbol: String,
  name: String,
  exchange: String,
  status: String,
  series: String,
  isin: String,
  lot_size: Number,
  face_value: String,
  last_seen_at: Date,
  created_at: Date,
  updated_at: Date
};

// Popular Indian stocks to seed
const popularStocks = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE002A01018' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE467B01029' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE040A01034' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE009A01021' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE090A01021' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE030A01027' },
  { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE154A01025' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', series: 'EQ', isin: 'INE062A01020' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE397D01024' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE237A01028' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE238A01034' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE021A01026' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE585B01010' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE860A01027' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE044A01036' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE075A01022' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE481G01011' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE239A01016' },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE752E01010' },
  { symbol: 'NTPC', name: 'NTPC Ltd', exchange: 'NSE', series: 'EQ', isin: 'INE733E01010' }
];

async function populateStockUniverse() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔄 Starting stock universe population...');
    
    // Connect to database
    await client.connect();
    console.log('✅ Database connected');
    
    // Clear existing data
    await client.query('DELETE FROM stock_symbols');
    console.log('🗑️  Cleared existing stock symbols');
    
    // Insert popular stocks
    const insertQuery = `
      INSERT INTO stock_symbols (symbol, name, exchange, status, series, isin, lot_size, face_value, last_seen_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    
    const now = new Date();
    
    for (const stock of popularStocks) {
      await client.query(insertQuery, [
        stock.symbol,
        stock.name,
        stock.exchange,
        'active',
        stock.series,
        stock.isin,
        1, // lot_size
        '1.00', // face_value
        now,
        now,
        now
      ]);
    }
    
    console.log(`✅ Inserted ${popularStocks.length} popular stocks`);
    
    // Verify insertion
    const countResult = await client.query('SELECT COUNT(*) FROM stock_symbols');
    console.log(`📊 Total stocks in database: ${countResult.rows[0].count}`);
    
    // Test search functionality
    const searchResults = await client.query(
      'SELECT symbol, name, exchange FROM stock_symbols WHERE symbol ILIKE $1 LIMIT 5',
      ['%RELIANCE%']
    );
    
    console.log('🔍 Search test results:');
    searchResults.rows.forEach(stock => {
      console.log(`  - ${stock.symbol}: ${stock.name} (${stock.exchange})`);
    });
    
    console.log('🎉 Stock universe population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error populating stock universe:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  populateStockUniverse();
}

module.exports = { populateStockUniverse };
