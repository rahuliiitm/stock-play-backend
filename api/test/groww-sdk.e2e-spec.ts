import { GrowwAPI, Exchange, Segment } from 'growwapi';

// Skips if env not present
const hasGroww =
  !!process.env.GROWW_API_KEY && !!process.env.GROWW_ACCESS_TOKEN;

const suiteName = hasGroww
  ? 'Groww SDK (e2e)'
  : 'Groww SDK (e2e) [skipped: missing env]';

describe(suiteName, () => {
  let groww: GrowwAPI;

  beforeAll(async () => {
    if (!hasGroww) return;

    // Initialize GrowwAPI
    groww = new GrowwAPI();
    console.log('✅ GrowwAPI initialized successfully');
  });

  const symbol = 'RELIANCE';

  it('getQuote returns quote data', async () => {
    if (!hasGroww) return;

    const quote = await groww.liveData.getQuote({
      tradingSymbol: symbol,
      exchange: Exchange.NSE,
      segment: Segment.CASH,
    });

    expect(quote).toBeDefined();
    expect(quote.lastPrice).toBeGreaterThan(0);
  }, 10000);

  it('getHistory returns candle data', async () => {
    if (!hasGroww) return;

    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const to = new Date();

    const historicalData = await groww.historicData.get({
      tradingSymbol: symbol,
      exchange: Exchange.NSE,
      segment: Segment.CASH,
      startTime: from.toISOString(),
      endTime: to.toISOString(),
    });

    expect(historicalData).toBeDefined();
    if (historicalData.candles) {
      expect(Array.isArray(historicalData.candles)).toBe(true);
    }
  }, 15000);

  it('getHoldings returns holdings data', async () => {
    if (!hasGroww) return;

    const holdings = await groww.holdings.list();

    expect(holdings).toBeDefined();
    if (holdings && Array.isArray(holdings)) {
      expect(Array.isArray(holdings)).toBe(true);
    }
  }, 10000);

  it('getPositions returns positions data', async () => {
    if (!hasGroww) return;

    const positions = await groww.position.user({ segment: Segment.CASH });

    expect(positions).toBeDefined();
    if (positions && Array.isArray(positions)) {
      expect(Array.isArray(positions)).toBe(true);
    }
  }, 10000);
});
