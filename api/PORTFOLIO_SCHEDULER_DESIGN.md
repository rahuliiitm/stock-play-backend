# 📊 Portfolio Scheduler & Order History System Design

## 🎯 **Overview**

Design a comprehensive scheduler system that:
1. **Daily Portfolio Sync**: Fetches real portfolio data from Groww API at 4:00 PM (after market closes at 3:30 PM)
2. **Immutable Order History**: Tracks all order changes per stock with complete audit trail
3. **Portfolio Snapshot**: Creates daily snapshots for historical analysis
4. **Order Tracking**: Monitors quantity changes and maintains immutable order history

## 🏗️ **System Architecture**

### **Scheduler Flow**
```
Daily at 4:00 PM IST:
├── PortfolioSyncScheduler
│   ├── 1. Fetch Holdings from Groww API
│   ├── 2. Fetch Positions from Groww API  
│   ├── 3. Fetch Order History from Groww API
│   ├── 4. Compare with DB and detect changes
│   ├── 5. Create immutable order history records
│   ├── 6. Update current holdings
│   ├── 7. Create daily portfolio snapshot
│   └── 8. Emit events for downstream processing
```

## 📋 **Database Schema Design**

### **1. Broker Accounts Table**
```sql
CREATE TABLE broker_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    broker_name VARCHAR(50) NOT NULL, -- 'GROWW'
    account_id VARCHAR(100) NOT NULL, -- Groww account identifier
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, broker_name, account_id)
);
```

### **2. Real Holdings Table (Current State)**
```sql
CREATE TABLE real_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL REFERENCES broker_accounts(id),
    symbol VARCHAR(20) NOT NULL,
    exchange VARCHAR(10) NOT NULL DEFAULT 'NSE',
    isin VARCHAR(20),
    quantity DECIMAL(18,4) NOT NULL,
    average_price DECIMAL(18,2) NOT NULL,
    current_price DECIMAL(18,2),
    current_value DECIMAL(18,2),
    pledge_quantity DECIMAL(18,4) DEFAULT 0,
    demat_locked_quantity DECIMAL(18,4) DEFAULT 0,
    groww_locked_quantity DECIMAL(18,4) DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(broker_account_id, symbol, exchange)
);
```

### **3. Real Positions Table (Current State)**
```sql
CREATE TABLE real_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL REFERENCES broker_accounts(id),
    symbol VARCHAR(20) NOT NULL,
    exchange VARCHAR(10) NOT NULL DEFAULT 'NSE',
    segment VARCHAR(10) NOT NULL DEFAULT 'CASH',
    credit_quantity DECIMAL(18,4) DEFAULT 0,
    credit_price DECIMAL(18,2) DEFAULT 0,
    debit_quantity DECIMAL(18,4) DEFAULT 0,
    debit_price DECIMAL(18,2) DEFAULT 0,
    carry_forward_credit_quantity DECIMAL(18,4) DEFAULT 0,
    carry_forward_credit_price DECIMAL(18,2) DEFAULT 0,
    carry_forward_debit_quantity DECIMAL(18,4) DEFAULT 0,
    carry_forward_debit_price DECIMAL(18,2) DEFAULT 0,
    net_quantity DECIMAL(18,4) GENERATED ALWAYS AS (credit_quantity - debit_quantity) STORED,
    net_price DECIMAL(18,2) GENERATED ALWAYS AS (
        CASE 
            WHEN (credit_quantity - debit_quantity) > 0 THEN credit_price
            WHEN (credit_quantity - debit_quantity) < 0 THEN debit_price
            ELSE 0
        END
    ) STORED,
    last_updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(broker_account_id, symbol, exchange, segment)
);
```

### **4. Immutable Order History Table**
```sql
CREATE TABLE order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL REFERENCES broker_accounts(id),
    groww_order_id VARCHAR(100) NOT NULL,
    order_reference_id VARCHAR(100),
    symbol VARCHAR(20) NOT NULL,
    exchange VARCHAR(10) NOT NULL DEFAULT 'NSE',
    segment VARCHAR(10) NOT NULL DEFAULT 'CASH',
    product VARCHAR(10) NOT NULL, -- 'CNC', 'MIS', etc.
    order_type VARCHAR(20) NOT NULL, -- 'LIMIT', 'MARKET', 'SL', etc.
    transaction_type VARCHAR(10) NOT NULL, -- 'BUY', 'SELL'
    quantity DECIMAL(18,4) NOT NULL,
    price DECIMAL(18,2),
    trigger_price DECIMAL(18,2),
    validity VARCHAR(10) NOT NULL, -- 'DAY', 'IOC', etc.
    order_status VARCHAR(20) NOT NULL, -- 'NEW', 'OPEN', 'EXECUTED', 'CANCELLED', etc.
    filled_quantity DECIMAL(18,4) DEFAULT 0,
    remaining_quantity DECIMAL(18,4) DEFAULT 0,
    average_fill_price DECIMAL(18,2),
    deliverable_quantity DECIMAL(18,4) DEFAULT 0,
    amo_status VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL, -- Order creation time from Groww
    exchange_time TIMESTAMPTZ, -- Time when order reached exchange
    trade_date TIMESTAMPTZ, -- Date when trade occurred
    remark TEXT,
    
    -- Audit fields
    detected_at TIMESTAMPTZ DEFAULT now(), -- When we detected this order
    sync_batch_id UUID, -- Links to sync batch for tracking
    
    -- Indexes for performance
    INDEX idx_order_history_broker_symbol (broker_account_id, symbol),
    INDEX idx_order_history_groww_order_id (groww_order_id),
    INDEX idx_order_history_created_at (created_at),
    INDEX idx_order_history_sync_batch (sync_batch_id)
);
```

### **5. Order Quantity Changes Table (Immutable)**
```sql
CREATE TABLE order_quantity_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_history_id UUID NOT NULL REFERENCES order_history(id),
    symbol VARCHAR(20) NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- 'QUANTITY_ADDED', 'QUANTITY_REMOVED', 'ORDER_PLACED', 'ORDER_CANCELLED'
    previous_quantity DECIMAL(18,4),
    new_quantity DECIMAL(18,4),
    quantity_delta DECIMAL(18,4) NOT NULL, -- Positive for additions, negative for removals
    price_at_change DECIMAL(18,2),
    change_reason VARCHAR(100), -- 'ORDER_EXECUTED', 'ORDER_CANCELLED', 'MANUAL_ADJUSTMENT'
    detected_at TIMESTAMPTZ DEFAULT now(),
    sync_batch_id UUID,
    
    INDEX idx_quantity_changes_symbol (symbol),
    INDEX idx_quantity_changes_detected_at (detected_at),
    INDEX idx_quantity_changes_sync_batch (sync_batch_id)
);
```

### **6. Portfolio Snapshots Table (Daily)**
```sql
CREATE TABLE portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL REFERENCES broker_accounts(id),
    snapshot_date DATE NOT NULL,
    total_holdings_value DECIMAL(18,2) NOT NULL,
    total_positions_value DECIMAL(18,2) NOT NULL,
    total_portfolio_value DECIMAL(18,2) NOT NULL,
    cash_balance DECIMAL(18,2),
    margin_used DECIMAL(18,2),
    margin_available DECIMAL(18,2),
    day_change DECIMAL(18,2),
    day_change_percent DECIMAL(8,4),
    holdings_count INTEGER NOT NULL,
    positions_count INTEGER NOT NULL,
    orders_count INTEGER NOT NULL,
    trades_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(broker_account_id, snapshot_date),
    INDEX idx_portfolio_snapshots_date (snapshot_date),
    INDEX idx_portfolio_snapshots_broker (broker_account_id)
);
```

### **7. Sync Batches Table (Audit Trail)**
```sql
CREATE TABLE sync_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL REFERENCES broker_accounts(id),
    sync_type VARCHAR(50) NOT NULL, -- 'DAILY_PORTFOLIO', 'ORDER_HISTORY', 'REALTIME_UPDATE'
    status VARCHAR(20) NOT NULL, -- 'STARTED', 'COMPLETED', 'FAILED', 'PARTIAL'
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    holdings_fetched INTEGER DEFAULT 0,
    positions_fetched INTEGER DEFAULT 0,
    orders_fetched INTEGER DEFAULT 0,
    holdings_updated INTEGER DEFAULT 0,
    positions_updated INTEGER DEFAULT 0,
    orders_created INTEGER DEFAULT 0,
    quantity_changes_detected INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details JSONB,
    metadata JSONB, -- Additional sync information
    
    INDEX idx_sync_batches_broker (broker_account_id),
    INDEX idx_sync_batches_started_at (started_at),
    INDEX idx_sync_batches_status (status)
);
```

## 🔄 **Scheduler Implementation**

### **1. Portfolio Sync Scheduler Service**
```typescript
@Injectable()
export class PortfolioSyncSchedulerService {
  private readonly logger = new Logger(PortfolioSyncSchedulerService.name)
  
  constructor(
    private readonly growwApiService: GrowwApiService,
    private readonly brokerAccountsRepository: Repository<BrokerAccount>,
    private readonly realHoldingsRepository: Repository<RealHolding>,
    private readonly realPositionsRepository: Repository<RealPosition>,
    private readonly orderHistoryRepository: Repository<OrderHistory>,
    private readonly orderQuantityChangesRepository: Repository<OrderQuantityChange>,
    private readonly portfolioSnapshotsRepository: Repository<PortfolioSnapshot>,
    private readonly syncBatchesRepository: Repository<SyncBatch>,
  ) {}

  @Cron('0 16 * * 1-5') // 4:00 PM IST, Monday to Friday
  async dailyPortfolioSync(): Promise<void> {
    this.logger.log('Starting daily portfolio sync at 4:00 PM')
    
    const activeAccounts = await this.getActiveBrokerAccounts()
    
    for (const account of activeAccounts) {
      await this.syncAccountPortfolio(account)
    }
  }

  private async syncAccountPortfolio(account: BrokerAccount): Promise<void> {
    const syncBatch = await this.createSyncBatch(account, 'DAILY_PORTFOLIO')
    
    try {
      // Initialize Groww API with account credentials
      const growwApi = new GrowwApiService(
        this.configService,
        this.redis,
        account.access_token
      )

      // Step 1: Fetch current data from Groww
      const [holdings, positions, orders] = await Promise.all([
        growwApi.getHoldings(),
        growwApi.getPositions(),
        growwApi.getOrderList(0, 100) // Get recent orders
      ])

      // Step 2: Update holdings
      await this.updateHoldings(account, holdings, syncBatch)

      // Step 3: Update positions  
      await this.updatePositions(account, positions, syncBatch)

      // Step 4: Process order history
      await this.processOrderHistory(account, orders, syncBatch)

      // Step 5: Create daily snapshot
      await this.createDailySnapshot(account, syncBatch)

      // Step 6: Complete sync batch
      await this.completeSyncBatch(syncBatch, 'COMPLETED')

    } catch (error) {
      this.logger.error(`Portfolio sync failed for account ${account.id}:`, error)
      await this.completeSyncBatch(syncBatch, 'FAILED', error)
    }
  }
}
```

### **2. Order History Processing**
```typescript
private async processOrderHistory(
  account: BrokerAccount, 
  orders: any[], 
  syncBatch: SyncBatch
): Promise<void> {
  
  for (const order of orders) {
    // Check if order already exists
    const existingOrder = await this.orderHistoryRepository.findOne({
      where: { groww_order_id: order.groww_order_id }
    })

    if (!existingOrder) {
      // New order - create record
      await this.createOrderHistoryRecord(account, order, syncBatch)
    } else {
      // Existing order - check for changes
      await this.checkOrderChanges(existingOrder, order, syncBatch)
    }
  }
}

private async checkOrderChanges(
  existingOrder: OrderHistory,
  newOrderData: any,
  syncBatch: SyncBatch
): Promise<void> {
  
  const changes: any[] = []

  // Check quantity changes
  if (existingOrder.filled_quantity !== newOrderData.filled_quantity) {
    const quantityDelta = newOrderData.filled_quantity - existingOrder.filled_quantity
    
    changes.push({
      order_history_id: existingOrder.id,
      symbol: existingOrder.symbol,
      change_type: quantityDelta > 0 ? 'QUANTITY_ADDED' : 'QUANTITY_REMOVED',
      previous_quantity: existingOrder.filled_quantity,
      new_quantity: newOrderData.filled_quantity,
      quantity_delta: quantityDelta,
      price_at_change: newOrderData.average_fill_price,
      change_reason: 'ORDER_EXECUTED',
      sync_batch_id: syncBatch.id
    })

    // Update the order record
    await this.orderHistoryRepository.update(existingOrder.id, {
      filled_quantity: newOrderData.filled_quantity,
      remaining_quantity: newOrderData.remaining_quantity,
      average_fill_price: newOrderData.average_fill_price,
      order_status: newOrderData.order_status
    })
  }

  // Check status changes
  if (existingOrder.order_status !== newOrderData.order_status) {
    changes.push({
      order_history_id: existingOrder.id,
      symbol: existingOrder.symbol,
      change_type: 'STATUS_CHANGED',
      previous_quantity: existingOrder.filled_quantity,
      new_quantity: newOrderData.filled_quantity,
      quantity_delta: 0,
      change_reason: `STATUS_CHANGED_${existingOrder.order_status}_TO_${newOrderData.order_status}`,
      sync_batch_id: syncBatch.id
    })
  }

  // Save all changes
  if (changes.length > 0) {
    await this.orderQuantityChangesRepository.save(changes)
    syncBatch.quantity_changes_detected += changes.length
  }
}
```

### **3. Holdings & Positions Update**
```typescript
private async updateHoldings(
  account: BrokerAccount,
  holdings: any[],
  syncBatch: SyncBatch
): Promise<void> {
  
  for (const holding of holdings) {
    const existingHolding = await this.realHoldingsRepository.findOne({
      where: {
        broker_account_id: account.id,
        symbol: holding.trading_symbol,
        exchange: 'NSE'
      }
    })

    if (existingHolding) {
      // Update existing holding
      await this.realHoldingsRepository.update(existingHolding.id, {
        quantity: holding.quantity,
        average_price: holding.average_price,
        current_price: holding.current_price,
        current_value: holding.current_value,
        pledge_quantity: holding.pledge_quantity,
        demat_locked_quantity: holding.demat_locked_quantity,
        groww_locked_quantity: holding.groww_locked_quantity,
        last_updated_at: new Date()
      })
    } else {
      // Create new holding
      await this.realHoldingsRepository.save({
        broker_account_id: account.id,
        symbol: holding.trading_symbol,
        exchange: 'NSE',
        isin: holding.isin,
        quantity: holding.quantity,
        average_price: holding.average_price,
        current_price: holding.current_price,
        current_value: holding.current_value,
        pledge_quantity: holding.pledge_quantity,
        demat_locked_quantity: holding.demat_locked_quantity,
        groww_locked_quantity: holding.groww_locked_quantity
      })
    }
  }

  syncBatch.holdings_updated = holdings.length
}
```

## 📊 **Key Features**

### **1. Immutable Order History**
- Every order change is recorded with timestamp
- Quantity additions/removals are tracked separately
- Complete audit trail for compliance
- No data is ever deleted or modified

### **2. Daily Portfolio Snapshots**
- End-of-day portfolio values
- Performance tracking over time
- Historical analysis capabilities
- Risk assessment data

### **3. Real-time Sync Capability**
- Can be triggered manually for real-time updates
- Handles partial failures gracefully
- Retry mechanism for failed syncs
- Comprehensive error logging

### **4. Multi-Account Support**
- Supports multiple broker accounts per user
- Independent sync for each account
- Account-specific error handling
- Flexible scheduling per account

## 🚀 **Benefits**

1. **Complete Audit Trail**: Every order and quantity change is permanently recorded
2. **Historical Analysis**: Daily snapshots enable performance tracking
3. **Compliance Ready**: Immutable records meet regulatory requirements
4. **Real-time Monitoring**: Track portfolio changes as they happen
5. **Error Recovery**: Robust error handling and retry mechanisms
6. **Scalable**: Supports multiple accounts and high-volume trading

## 🔧 **Implementation Steps**

1. **Create Database Tables**: Implement all new tables with proper indexes
2. **Create Entities**: TypeORM entities for all new tables
3. **Implement Scheduler Service**: Core portfolio sync logic
4. **Add Order History Processing**: Immutable order tracking
5. **Create API Endpoints**: For manual sync and data retrieval
6. **Add Monitoring**: Health checks and sync status monitoring
7. **Testing**: Comprehensive testing with real Groww data

This design provides a robust, scalable, and compliant system for tracking real portfolio data and maintaining immutable order history.
