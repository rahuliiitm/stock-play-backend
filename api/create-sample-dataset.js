const fs = require('fs');

/**
 * Create a smaller sample dataset for efficient backtesting
 */
async function createSampleDataset() {
  console.log('🔄 Creating sample dataset for efficient backtesting...');
  
  const inputFile = 'data/NIFTY_10year_15m.csv';
  const outputFile = 'data/NIFTY_sample_15m.csv';
  
  if (!fs.existsSync(inputFile)) {
    console.error('❌ Input file not found:', inputFile);
    return;
  }
  
  console.log('📊 Reading 10-year data...');
  const data = fs.readFileSync(inputFile, 'utf8');
  const lines = data.trim().split('\n');
  
  console.log(`📈 Total 15-minute candles: ${lines.length - 1}`);
  
  // Create sample datasets for different periods
  const samples = [
    {
      name: '2015 Sample',
      startDate: new Date('2015-01-09T00:00:00.000Z'),
      endDate: new Date('2015-06-30T23:59:59.000Z'),
      outputFile: 'data/NIFTY_2015_sample.csv'
    },
    {
      name: '2018 Sample',
      startDate: new Date('2018-01-01T00:00:00.000Z'),
      endDate: new Date('2018-06-30T23:59:59.000Z'),
      outputFile: 'data/NIFTY_2018_sample.csv'
    },
    {
      name: '2020 COVID Sample',
      startDate: new Date('2020-01-01T00:00:00.000Z'),
      endDate: new Date('2020-06-30T23:59:59.000Z'),
      outputFile: 'data/NIFTY_2020_covid.csv'
    },
    {
      name: '2021 Recovery Sample',
      startDate: new Date('2021-01-01T00:00:00.000Z'),
      endDate: new Date('2021-06-30T23:59:59.000Z'),
      outputFile: 'data/NIFTY_2021_recovery.csv'
    },
    {
      name: '2024 Recent Sample',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-06-30T23:59:59.000Z'),
      outputFile: 'data/NIFTY_2024_recent.csv'
    }
  ];
  
  for (const sample of samples) {
    console.log(`\n📊 Creating ${sample.name}...`);
    
    const sampleCandles = [];
    const header = lines[0];
    
    for (let i = 1; i < lines.length; i++) {
      const [timestamp, open, high, low, close, volume] = lines[i].split(',');
      const candleTime = new Date(parseInt(timestamp));
      
      if (candleTime >= sample.startDate && candleTime <= sample.endDate) {
        sampleCandles.push(lines[i]);
      }
    }
    
    console.log(`   📈 Found ${sampleCandles.length} candles`);
    
    if (sampleCandles.length > 0) {
      const csvContent = [header, ...sampleCandles].join('\n');
      fs.writeFileSync(sample.outputFile, csvContent);
      
      console.log(`   ✅ Saved to: ${sample.outputFile}`);
      console.log(`   📅 Date range: ${new Date(parseInt(sampleCandles[0].split(',')[0])).toISOString()} to ${new Date(parseInt(sampleCandles[sampleCandles.length-1].split(',')[0])).toISOString()}`);
    } else {
      console.log(`   ⚠️  No data found for ${sample.name}`);
    }
  }
  
  console.log('\n🎉 Sample datasets created successfully!');
  console.log('\n📋 Available sample datasets:');
  samples.forEach(sample => {
    if (fs.existsSync(sample.outputFile)) {
      const stats = fs.statSync(sample.outputFile);
      console.log(`   📁 ${sample.name}: ${sample.outputFile} (${(stats.size / 1024).toFixed(1)} KB)`);
    }
  });
  
  return samples;
}

// Run the sample creation
createSampleDataset().catch(error => {
  console.error('❌ Sample creation failed:', error);
});
