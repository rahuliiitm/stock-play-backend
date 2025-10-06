// Debug date comparison logic
const startDate = new Date('2023-01-01T00:00:00.000Z');
const endDate = new Date('2023-12-31T23:59:59.000Z');
const candleDate = new Date('2023-01-01T18:30:00.000Z');

console.log('🔍 Date Comparison Debug:');
console.log('Start Date:', startDate.toISOString());
console.log('End Date:', endDate.toISOString());
console.log('Candle Date:', candleDate.toISOString());
console.log('');

console.log('📊 Comparisons:');
console.log('candleDate >= startDate:', candleDate >= startDate);
console.log('candleDate <= endDate:', candleDate <= endDate);
console.log('candleDate >= startDate && candleDate <= endDate:', candleDate >= startDate && candleDate <= endDate);
console.log('');

console.log('📊 Timestamps:');
console.log('startDate.getTime():', startDate.getTime());
console.log('endDate.getTime():', endDate.getTime());
console.log('candleDate.getTime():', candleDate.getTime());
console.log('');

console.log('📊 Time differences:');
console.log('candleDate - startDate (ms):', candleDate.getTime() - startDate.getTime());
console.log('endDate - candleDate (ms):', endDate.getTime() - candleDate.getTime());


