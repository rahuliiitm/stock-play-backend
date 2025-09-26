-- StockPlay Database Setup Script
-- This script creates all necessary tables for the StockPlay application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email citext UNIQUE NOT NULL,
    password_hash text NOT NULL,
    display_name varchar(100),
    avatar_url text,
    role varchar(16) NOT NULL DEFAULT 'user',
    status varchar(16) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Broker accounts table
CREATE TABLE IF NOT EXISTS broker_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broker varchar(50) NOT NULL,
    account_id varchar(100) NOT NULL,
    account_name varchar(100),
    api_key varchar(255) NOT NULL,
    api_secret varchar(255) NOT NULL,
    access_token text,
    token_expires_at timestamptz,
    status varchar(20) NOT NULL DEFAULT 'active',
    last_sync_at timestamptz,
    last_sync_error text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, broker, account_id)
);

-- Real holdings table (from Groww API)
CREATE TABLE IF NOT EXISTS real_holdings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id uuid NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
    symbol varchar(20) NOT NULL,
    exchange varchar(10) NOT NULL DEFAULT 'NSE',
    isin varchar(20),
    quantity decimal(18,4) NOT NULL,
    average_price decimal(18,2) NOT NULL,
    current_price decimal(18,2),
    current_value decimal(18,2),
    pledge_quantity decimal(18,4) NOT NULL DEFAULT 0,
    demat_locked_quantity decimal(18,4) NOT NULL DEFAULT 0,
    groww_locked_quantity decimal(18,4) NOT NULL DEFAULT 0,
    last_updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(broker_account_id, symbol, exchange)
);

-- Real positions table (from Groww API)
CREATE TABLE IF NOT EXISTS real_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id uuid NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
    symbol varchar(20) NOT NULL,
    exchange varchar(10) NOT NULL DEFAULT 'NSE',
    segment varchar(20) NOT NULL DEFAULT 'CASH',
    credit_quantity decimal(18,4) NOT NULL DEFAULT 0,
    credit_price decimal(18,2) NOT NULL DEFAULT 0,
    debit_quantity decimal(18,4) NOT NULL DEFAULT 0,
    debit_price decimal(18,2) NOT NULL DEFAULT 0,
    carry_forward_credit_quantity decimal(18,4) NOT NULL DEFAULT 0,
    carry_forward_credit_price decimal(18,2) NOT NULL DEFAULT 0,
    carry_forward_debit_quantity decimal(18,4) NOT NULL DEFAULT 0,
    carry_forward_debit_price decimal(18,2) NOT NULL DEFAULT 0,
    net_quantity decimal(18,4) NOT NULL DEFAULT 0,
    net_price decimal(18,2) NOT NULL DEFAULT 0,
    net_value decimal(18,2) NOT NULL DEFAULT 0,
    pnl decimal(18,2) NOT NULL DEFAULT 0,
    pnl_percentage decimal(8,4) NOT NULL DEFAULT 0,
    last_updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(broker_account_id, symbol, exchange, segment)
);

-- Order history table
CREATE TABLE IF NOT EXISTS order_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id uuid NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
    groww_order_id varchar(100) NOT NULL,
    order_reference_id varchar(100),
    symbol varchar(20) NOT NULL,
    exchange varchar(10) NOT NULL DEFAULT 'NSE',
    segment varchar(20) NOT NULL DEFAULT 'CASH',
    product varchar(20),
    order_type varchar(20),
    transaction_type varchar(20),
    quantity decimal(18,4) NOT NULL,
    price decimal(18,2),
    trigger_price decimal(18,2),
    validity varchar(20),
    order_status varchar(20),
    filled_quantity decimal(18,4) NOT NULL DEFAULT 0,
    remaining_quantity decimal(18,4) NOT NULL DEFAULT 0,
    average_fill_price decimal(18,2),
    deliverable_quantity decimal(18,4) NOT NULL DEFAULT 0,
    amo_status varchar(20),
    created_at timestamptz NOT NULL,
    exchange_time timestamptz,
    trade_date timestamptz,
    remark text,
    sync_batch_id uuid,
    UNIQUE(groww_order_id)
);

-- Order quantity changes table
CREATE TABLE IF NOT EXISTS order_quantity_changes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_history_id uuid NOT NULL REFERENCES order_history(id) ON DELETE CASCADE,
    symbol varchar(20) NOT NULL,
    change_type varchar(20) NOT NULL,
    previous_quantity decimal(18,4) NOT NULL,
    new_quantity decimal(18,4) NOT NULL,
    quantity_delta decimal(18,4) NOT NULL,
    price_at_change decimal(18,2),
    change_reason varchar(100),
    detected_at timestamptz NOT NULL DEFAULT now(),
    sync_batch_id uuid
);

-- Portfolio snapshots table
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id uuid NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
    snapshot_date date NOT NULL,
    total_holdings_value decimal(18,2) NOT NULL DEFAULT 0,
    total_positions_value decimal(18,2) NOT NULL DEFAULT 0,
    total_portfolio_value decimal(18,2) NOT NULL DEFAULT 0,
    day_change decimal(18,2) NOT NULL DEFAULT 0,
    day_change_percent decimal(8,4) NOT NULL DEFAULT 0,
    holdings_count integer NOT NULL DEFAULT 0,
    positions_count integer NOT NULL DEFAULT 0,
    orders_count integer NOT NULL DEFAULT 0,
    trades_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(broker_account_id, snapshot_date)
);

-- Sync batches table
CREATE TABLE IF NOT EXISTS sync_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id uuid NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
    sync_type varchar(20) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'STARTED',
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    holdings_fetched integer NOT NULL DEFAULT 0,
    holdings_updated integer NOT NULL DEFAULT 0,
    positions_fetched integer NOT NULL DEFAULT 0,
    positions_updated integer NOT NULL DEFAULT 0,
    orders_fetched integer NOT NULL DEFAULT 0,
    orders_created integer NOT NULL DEFAULT 0,
    quantity_changes_detected integer NOT NULL DEFAULT 0,
    errors_count integer NOT NULL DEFAULT 0,
    error_details jsonb
);

-- Broker tokens table
CREATE TABLE IF NOT EXISTS broker_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id uuid NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
    token_type varchar(20) NOT NULL,
    token_value text NOT NULL,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_broker_accounts_user_id ON broker_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_broker ON broker_accounts(broker);
CREATE INDEX IF NOT EXISTS idx_real_holdings_broker_account ON real_holdings(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_real_holdings_symbol ON real_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_real_positions_broker_account ON real_positions(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_real_positions_symbol ON real_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_order_history_broker_account ON order_history(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_order_history_symbol ON order_history(symbol);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_history(created_at);
CREATE INDEX IF NOT EXISTS idx_order_quantity_changes_order_history ON order_quantity_changes(order_history_id);
CREATE INDEX IF NOT EXISTS idx_order_quantity_changes_symbol ON order_quantity_changes(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_broker_account ON portfolio_snapshots(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_date ON portfolio_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_sync_batches_broker_account ON sync_batches(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_sync_batches_status ON sync_batches(status);
CREATE INDEX IF NOT EXISTS idx_broker_tokens_broker_account ON broker_tokens(broker_account_id);

-- Insert a test user for development
INSERT INTO users (id, email, password_hash, display_name, role) 
VALUES (
    '569507b0-e56c-4f2b-b4bc-b44dffab820e',
    'test@stockplay.com',
    '$2b$10$example.hash.for.testing',
    'Test User',
    'user'
) ON CONFLICT (email) DO NOTHING;

-- Insert a test broker account for development
INSERT INTO broker_accounts (id, user_id, broker, account_id, account_name, api_key, api_secret, status)
VALUES (
    gen_random_uuid(),
    '569507b0-e56c-4f2b-b4bc-b44dffab820e',
    'groww',
    'test-account-123',
    'Test Groww Account',
    'test-api-key',
    'test-api-secret',
    'active'
) ON CONFLICT (user_id, broker, account_id) DO NOTHING;
