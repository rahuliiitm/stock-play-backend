📄 portfolio-contest-requirements.md
1. Overview
We need to implement a Portfolio Contest type where:
Users are given an initial virtual balance (e.g., ₹1,00,000 or $10,000).
They build a virtual portfolio by selecting stocks and assigning weights/quantities.
The contest runs over a defined timeline (start/end date).
Each day, a crawler updates LTP (Last Traded Price) for all relevant stocks.
A scheduled job calculates:
Per-stock gains/losses per participant.
Portfolio-level returns per participant.
Leaderboards update dynamically based on returns.
Contest rules may allow portfolio rebalancing during the contest.
2. Core Components
2.1 Contest Definition for Portfolio Contest
Contest metadata:
Contest type: "portfolio"
Start date / End date
Initial amount
Allowed stock universe (e.g., NSE 500, custom list)
Max number of stocks allowed in portfolio
Rebalancing rules (e.g., frequency, max transactions)
Commission/transaction cost rules (optional)
Must be stored in DB with a JSON rules config:
{
  "initialAmount": 100000,
  "maxStocks": 10,
  "allowedStocks": ["RELIANCE", "INFY", "TCS"],
  "rebalanceRules": {
    "maxRebalances": 3,
    "cooldownDays": 1
  }
}
2.2 Portfolio Management Module
Entities
PortfolioContest
PortfolioEntry (per user, per contest)
PortfolioStock (per stock in the portfolio)
StockPriceHistory
Features
Add/Remove stocks (respecting rules).
Update quantities during allowed rebalancing periods.
Track cash balance after transactions.
Store initial buy price & quantities for return calculations.
2.3 Market Data Crawler
Requirements
Fetch EOD (End of Day) or intraday LTP from:
Public APIs
Scraper for exchange websites (fallback)
Store in StockPriceHistory table:
Date
Stock symbol
LTP
Volume (optional)
Must run daily at market close via BullMQ/Kafka scheduled job.
Retry mechanism for failed fetches.
2.4 Return Calculation Job
Responsibilities
Runs daily (or hourly if intraday tracking needed).
For each participant’s portfolio:
Get latest LTP for each stock.
Calculate per-stock gain/loss:
gain = (currentPrice - buyPrice) * quantity
Calculate portfolio total value:
totalValue = Σ(stockValue) + cashBalance
returnPercent = ((totalValue - initialAmount) / initialAmount) * 100
Save results to PortfolioResult table for leaderboard queries.
2.5 Leaderboard Engine
Ranking criteria:
Primary: Highest portfolio return %
Secondary: Earliest gain achiever (if tie-breaker needed)
Integrate with existing ranking engine:
rankingMethod = "portfolio_return"
2.6 Rebalancing Logic
Check contest rules before allowing update:
Max number of rebalances
Cooldown period between rebalances
Max number of stocks in portfolio
Update:
Quantities
Cash balance
Transaction costs if applicable
Log changes in PortfolioTransactions table for audit.
3. Cursor API Execution Task List
Step 1: Data Models
 Create PortfolioContest entity.
 Create PortfolioEntry entity (links user & contest).
 Create PortfolioStock entity (per stock in portfolio).
 Create StockPriceHistory entity.
 Create PortfolioTransaction entity (for rebalances).
 Create PortfolioResult entity (daily snapshot).
Step 2: Portfolio Management APIs
 POST /portfolio/:contestId/add-stock
 POST /portfolio/:contestId/remove-stock
 POST /portfolio/:contestId/rebalance
 GET /portfolio/:contestId/current
 Validate against contest rules before updates.
Step 3: Market Data Crawler
 Create MarketDataService with:
fetchLTP(symbols: string[])
storePriceHistory(prices: PriceDTO[])
 Create BullMQ job crawl-stock-prices:
Runs daily at market close.
Fetches allowed stock symbols for active contests.
Stores in DB.
Step 4: Return Calculation Job
 Create BullMQ job calculate-portfolio-returns:
Fetch all active portfolios.
Get latest LTP from StockPriceHistory.
Calculate per-stock and total portfolio returns.
Store in PortfolioResult.
 Make it callable via API for manual recalculation.
Step 5: Leaderboard Integration
 Extend existing ranking engine:
Add portfolio_return ranking strategy.
 GET /portfolio/:contestId/leaderboard:
Returns ranked list with:
User ID
Portfolio value
Return %
Portfolio composition
Step 6: Rebalancing Rules
 Add RebalanceService:
Checks max rebalances allowed.
Checks cooldown period.
Validates stock count limits.
 Deduct transaction costs if defined.
Step 7: Extensibility
 Allow contest creator to define:
Allowed stock universe.
Initial capital.
Rebalancing limits.
Ranking method.
 Make crawler & calculation job reusable for other asset types.