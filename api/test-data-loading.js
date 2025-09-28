#!/usr/bin/env node

/**
 * Test Data Loading
 * 
 * This script tests if the CSV data provider can load the large dataset.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function testDataLoading() {
  try {
    console.log('🔍 Testing Data Loading');
    console.log('=' .repeat(40));
    
    const dataPath = '/Users/rjain/stockplay/stock-play-backend/api/data/NIFTY_15m.csv';
    
    console.log(`📁 Data file: ${dataPath}`);
    console.log(`📁 File exists: ${fs.existsSync(dataPath)}`);
    
    if (!fs.existsSync(dataPath)) {
      console.error('❌ Data file not found!');
      return;
    }
    
    const stats = fs.statSync(dataPath);
    console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    let rowCount = 0;
    let firstRow = null;
    let lastRow = null;
    
    console.log('📖 Reading CSV data...');
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(dataPath)
        .pipe(csv())
        .on('data', (row) => {
          if (rowCount === 0) {
            firstRow = row;
          }
          lastRow = row;
          rowCount++;
          
          if (rowCount % 1000 === 0) {
            console.log(`   Processed ${rowCount} rows...`);
          }
        })
        .on('end', () => {
          console.log(`✅ Successfully loaded ${rowCount} rows`);
          
          if (firstRow) {
            const firstDate = new Date(parseInt(firstRow.timestamp));
            console.log(`📅 First candle: ${firstDate.toISOString()}`);
          }
          
          if (lastRow) {
            const lastDate = new Date(parseInt(lastRow.timestamp));
            console.log(`📅 Last candle: ${lastDate.toISOString()}`);
          }
          
          // Test date filtering
          const testStartDate = new Date('2024-10-01T00:00:00.000Z');
          const testEndDate = new Date('2025-07-25T23:59:59.000Z');
          
          console.log(`\n🔍 Testing date filtering:`);
          console.log(`   Start: ${testStartDate.toISOString()}`);
          console.log(`   End: ${testEndDate.toISOString()}`);
          
          let filteredCount = 0;
          let firstFilteredRow = null;
          let lastFilteredRow = null;
          
          fs.createReadStream(dataPath)
            .pipe(csv())
            .on('data', (row) => {
              const timestamp = parseInt(row.timestamp);
              const candleDate = new Date(timestamp);
              
              if (candleDate >= testStartDate && candleDate <= testEndDate) {
                if (filteredCount === 0) {
                  firstFilteredRow = row;
                }
                lastFilteredRow = row;
                filteredCount++;
              }
            })
            .on('end', () => {
              console.log(`✅ Filtered data: ${filteredCount} candles in date range`);
              
              if (firstFilteredRow) {
                const firstDate = new Date(parseInt(firstFilteredRow.timestamp));
                console.log(`📅 First filtered candle: ${firstDate.toISOString()}`);
              }
              
              if (lastFilteredRow) {
                const lastDate = new Date(parseInt(lastFilteredRow.timestamp));
                console.log(`📅 Last filtered candle: ${lastDate.toISOString()}`);
              }
              
              resolve();
            })
            .on('error', reject);
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error testing data loading:', error.message);
  }
}

testDataLoading();
