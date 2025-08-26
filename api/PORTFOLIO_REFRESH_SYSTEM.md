# Portfolio Refresh System for Multiple Portfolios

## 🎯 Overview

The portfolio refresh system is designed to efficiently handle multiple portfolios with different update frequencies and priorities. It uses a **tiered approach** to optimize performance and resource usage.

---

## 📊 Portfolio Refresh Strategy

### 1. **Tiered Update Frequencies**

```typescript
// High Priority: Public Portfolios (Leaderboard)
@Cron(CronExpression.EVERY_5_MINUTES)
async refreshGlobalLeaderboard()

// Medium Priority: All Portfolios
@Cron(CronExpression.EVERY_HOUR)
async updateAllPortfolioValues()
```

### 2. **Update Methods**

#### **A. Public Portfolios (Every 5 minutes)**
```typescript
async updatePublicPortfolioValues(): Promise<void> {
  // Only update portfolios visible on leaderboard
  const publicPortfolios = await this.portfolios.find({
    where: { visibility: 'public' },
    relations: ['holdings']
  })

  for (const portfolio of publicPortfolios) {
    await this.updatePortfolioValue(portfolio.id)
  }
}
```

#### **B. All Portfolios (Every Hour)**
```typescript
async updateAllPortfolioValues(): Promise<void> {
  // Update ALL portfolios (public + private)
  const portfolios = await this.portfolios.find({
    relations: ['holdings']
  })

  for (const portfolio of portfolios) {
    await this.updatePortfolioValue(portfolio.id)
  }
}
```

#### **C. User-Specific Portfolios (On-demand)**
```typescript
async updateUserPortfolioValues(userId: string): Promise<void> {
  // Update portfolios for specific user
  const userPortfolios = await this.portfolios.find({
    where: { user_id: userId },
    relations: ['holdings']
  })

  for (const portfolio of userPortfolios) {
    await this.updatePortfolioValue(portfolio.id)
  }
}
```

---

## 🔄 Individual Portfolio Update Process

### **Step-by-Step Portfolio Refresh**

```typescript
async updatePortfolioValue(portfolioId: string): Promise<void> {
  // 1. Load portfolio with all holdings
  const portfolio = await this.portfolios.findOne({
    where: { id: portfolioId },
    relations: ['holdings']
  })

  let totalValueCents = 0
  const updatedHoldings: Holding[] = []

  // 2. Update each holding with real-time prices
  for (const holding of portfolio.holdings) {
    try {
      // Get real-time quote from Groww API
      const quote = await this.quotes.getQuote(holding.symbol)
      const currentPriceCents = quote.priceCents
      const currentValueCents = Math.round(currentPriceCents * parseFloat(holding.quantity))
      
      // Update holding value
      holding.current_value_cents = currentValueCents
      updatedHoldings.push(holding)
      totalValueCents += currentValueCents
    } catch (error) {
      // Graceful degradation - keep existing value
      totalValueCents += holding.current_value_cents || 0
    }
  }

  // 3. Save updated holdings
  await this.holdings.save(updatedHoldings)

  // 4. Calculate portfolio return
  const initialValueCents = portfolio.initial_value_cents || 0
  const returnPercent = initialValueCents > 0 ? 
    ((totalValueCents - initialValueCents) / initialValueCents) * 100 : 0

  // 5. Update portfolio and invalidate cache
  await this.portfolios.save(portfolio)
  await this.valuation.invalidatePortfolioCache(portfolioId)
}
```

---

## 🚀 Performance Optimizations

### 1. **Batch Processing**
- Process multiple portfolios in sequence
- Bulk save holdings updates
- Efficient database queries with relations

### 2. **Error Handling & Resilience**
```typescript
for (const portfolio of portfolios) {
  try {
    await this.updatePortfolioValue(portfolio.id)
  } catch (error) {
    // Continue with next portfolio if one fails
    this.logger.error(`Failed to update portfolio ${portfolio.id}:`, error)
  }
}
```

### 3. **Caching Strategy**
- Invalidate portfolio cache after updates
- Redis-based caching for frequently accessed data
- Reduce redundant API calls

### 4. **Graceful Degradation**
- Keep existing values if quote fetch fails
- Continue processing other holdings/portfolios
- Log errors for monitoring

---

## 📈 Real-Time Data Flow

### **Data Sources**
1. **Groww API**: Real-time stock quotes
2. **NSE API**: Historical data and fallback quotes
3. **Cached Data**: Redis for performance

### **Update Flow**
```
Market Data APIs (Groww/NSE)
    ↓
Portfolio Value Update Service
    ↓
Update Individual Holdings
    ↓
Calculate Portfolio Values
    ↓
Update Leaderboard Rankings
    ↓
Cache Invalidation
```

---

## 🎛️ Manual Control Options

### **API Endpoints for Manual Updates**

```typescript
// Update specific portfolio
POST /v2/portfolios/:portfolioId/update-value

// Update all portfolios (admin only)
POST /v2/portfolios/update-all-values

// Update public portfolios only (admin only)
POST /v2/portfolios/update-public-values
```

### **Use Cases for Manual Updates**
- User requests immediate portfolio refresh
- Admin maintenance operations
- Testing and debugging
- Emergency updates

---

## 📊 Monitoring & Logging

### **Comprehensive Logging**
```typescript
// Start of batch update
this.logger.log('Starting portfolio value update for all portfolios')

// Individual portfolio updates
this.logger.log(`Updated portfolio ${portfolioId}: total value = ${totalValueCents} cents, return = ${returnPercent.toFixed(2)}%`)

// Completion summary
this.logger.log(`Completed portfolio value update for ${portfolios.length} portfolios`)
```

### **Error Tracking**
- Failed quote fetches
- Portfolio update errors
- API rate limiting
- Database connection issues

---

## 🔧 Scalability Considerations

### **For Large Numbers of Portfolios**

1. **Parallel Processing**
```typescript
// Process portfolios in parallel batches
const batchSize = 10
const batches = chunk(portfolios, batchSize)

for (const batch of batches) {
  await Promise.all(
    batch.map(portfolio => this.updatePortfolioValue(portfolio.id))
  )
}
```

2. **Queue-Based Processing**
```typescript
// Use BullMQ for background processing
await this.portfolioQueue.add('update-portfolio', { portfolioId })
```

3. **Database Optimization**
- Index on frequently queried fields
- Efficient joins for portfolio-holdings relationships
- Connection pooling

---

## 🎯 Summary

The portfolio refresh system efficiently handles multiple portfolios through:

- ✅ **Tiered Updates**: Public portfolios every 5 min, all portfolios every hour
- ✅ **Real-Time Data**: Live quotes from Groww API
- ✅ **Error Resilience**: Graceful degradation and error handling
- ✅ **Performance**: Batch processing and caching
- ✅ **Scalability**: Designed for large numbers of portfolios
- ✅ **Monitoring**: Comprehensive logging and error tracking
- ✅ **Manual Control**: API endpoints for on-demand updates

**The system can handle thousands of portfolios efficiently while maintaining real-time accuracy!** 🚀
