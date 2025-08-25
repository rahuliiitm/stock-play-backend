import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { PortfolioPerformance } from '../../entities/PortfolioPerformance.entity'
import { PositionPerformance } from '../../entities/PositionPerformance.entity'
import { MarketMovers } from '../../entities/MarketMovers.entity'
import { Portfolio } from '../../entities/Portfolio.entity'
import { Position } from '../../entities/Position.entity'
import { ContestParticipant } from '../../entities/ContestParticipant.entity'
import { QuotesService } from '../stocks/quotes.service'
import { SymbolsService } from '../stocks/symbols.service'

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PortfolioPerformance)
    private readonly portfolioPerf: Repository<PortfolioPerformance>,

    @InjectRepository(PositionPerformance)
    private readonly positionPerf: Repository<PositionPerformance>,

    @InjectRepository(MarketMovers)
    private readonly marketMovers: Repository<MarketMovers>,

    @InjectRepository(Portfolio)
    private readonly portfolios: Repository<Portfolio>,

    @InjectRepository(Position)
    private readonly positions: Repository<Position>,

    @InjectRepository(ContestParticipant)
    private readonly participants: Repository<ContestParticipant>,

    private readonly quotes: QuotesService,
    private readonly symbols: SymbolsService,
  ) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100
  }

  private round4(n: number): number {
    return Math.round(n * 10000) / 10000
  }

  private async upsertPortfolioPerf(row: PortfolioPerformance) {
    // Use ON CONFLICT upsert on (portfolio_id, date)
    await this.portfolioPerf
      .createQueryBuilder()
      .insert()
      .values({
        portfolio_id: row.portfolio_id,
        date: row.date,
        period_type: row.period_type,
        total_value_amount: row.total_value_amount,
        cash_amount: row.cash_amount,
        positions_value_amount: row.positions_value_amount,
        daily_return_percent: row.daily_return_percent,
        cumulative_return_percent: row.cumulative_return_percent,
        daily_pnl_amount: row.daily_pnl_amount,
        cumulative_pnl_amount: row.cumulative_pnl_amount,
        volatility: row.volatility,
        sharpe_ratio: row.sharpe_ratio,
        max_drawdown_percent: row.max_drawdown_percent,
        benchmark_return_percent: row.benchmark_return_percent,
        alpha: row.alpha,
        beta: row.beta,
      })
      .onConflict(`("portfolio_id","date") DO UPDATE SET 
        period_type = EXCLUDED.period_type,
        total_value_amount = EXCLUDED.total_value_amount,
        cash_amount = EXCLUDED.cash_amount,
        positions_value_amount = EXCLUDED.positions_value_amount,
        daily_return_percent = EXCLUDED.daily_return_percent,
        cumulative_return_percent = EXCLUDED.cumulative_return_percent,
        daily_pnl_amount = EXCLUDED.daily_pnl_amount,
        cumulative_pnl_amount = EXCLUDED.cumulative_pnl_amount,
        volatility = EXCLUDED.volatility,
        sharpe_ratio = EXCLUDED.sharpe_ratio,
        max_drawdown_percent = EXCLUDED.max_drawdown_percent,
        benchmark_return_percent = EXCLUDED.benchmark_return_percent,
        alpha = EXCLUDED.alpha,
        beta = EXCLUDED.beta`)
      .execute()
  }

  private async upsertPositionPerf(row: PositionPerformance) {
    await this.positionPerf
      .createQueryBuilder()
      .insert()
      .values({
        position_id: row.position_id,
        portfolio_id: row.portfolio_id,
        symbol: row.symbol,
        date: row.date,
        period_type: row.period_type,
        quantity: row.quantity,
        avg_cost_amount: row.avg_cost_amount,
        market_price_amount: row.market_price_amount,
        market_value_amount: row.market_value_amount,
        daily_return_percent: row.daily_return_percent,
        total_return_percent: row.total_return_percent,
        daily_pnl_amount: row.daily_pnl_amount,
        unrealized_pnl_amount: row.unrealized_pnl_amount,
        realized_pnl_amount: row.realized_pnl_amount,
        weight_percent: row.weight_percent,
        contribution_to_return: row.contribution_to_return,
      })
      .onConflict(`("position_id","date") DO UPDATE SET 
        portfolio_id = EXCLUDED.portfolio_id,
        symbol = EXCLUDED.symbol,
        period_type = EXCLUDED.period_type,
        quantity = EXCLUDED.quantity,
        avg_cost_amount = EXCLUDED.avg_cost_amount,
        market_price_amount = EXCLUDED.market_price_amount,
        market_value_amount = EXCLUDED.market_value_amount,
        daily_return_percent = EXCLUDED.daily_return_percent,
        total_return_percent = EXCLUDED.total_return_percent,
        daily_pnl_amount = EXCLUDED.daily_pnl_amount,
        unrealized_pnl_amount = EXCLUDED.unrealized_pnl_amount,
        realized_pnl_amount = EXCLUDED.realized_pnl_amount,
        weight_percent = EXCLUDED.weight_percent,
        contribution_to_return = EXCLUDED.contribution_to_return`)
      .execute()
  }

  async calculateDailyPortfolioPerformance(portfolioId: string, date: Date = new Date()): Promise<PortfolioPerformance> {
    const portfolio = await this.portfolios.findOne({
      where: { id: portfolioId },
      relations: ['positions', 'participant']
    })

    if (!portfolio) throw new Error('Portfolio not found')

    const { totalValue, cashAmount, positionsValue } = await this.calculatePortfolioValue(portfolio)

    // Previous date (calendar day)
    const previousDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1))

    const previousPerf = await this.portfolioPerf.findOne({
      where: { portfolio_id: portfolioId, date: previousDate, period_type: 'daily' }
    })

    const previousValueRaw: any = previousPerf?.total_value_amount ?? portfolio.participant.starting_balance_amount
    const previousValue = parseFloat(String(previousValueRaw))
    const dailyReturn = previousValue > 0 ? ((totalValue - previousValue) / previousValue) * 100 : 0
    const dailyPnL = totalValue - previousValue

    const startingBalance = parseFloat(String(portfolio.participant.starting_balance_amount))
    const cumulativeReturn = startingBalance > 0 ? ((totalValue - startingBalance) / startingBalance) * 100 : 0
    const cumulativePnL = totalValue - startingBalance

    const { volatility, sharpeRatio, maxDrawdown } = await this.calculateRiskMetrics(portfolioId, date)

    const performance = new PortfolioPerformance()
    performance.portfolio_id = portfolioId
    performance.date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    performance.period_type = 'daily'
    performance.total_value_amount = this.round2(totalValue)
    performance.cash_amount = this.round2(cashAmount)
    performance.positions_value_amount = this.round2(positionsValue)
    performance.daily_return_percent = this.round4(dailyReturn)
    performance.cumulative_return_percent = this.round4(cumulativeReturn)
    performance.daily_pnl_amount = this.round2(dailyPnL)
    performance.cumulative_pnl_amount = this.round2(cumulativePnL)
    performance.volatility = volatility
    performance.sharpe_ratio = sharpeRatio
    performance.max_drawdown_percent = maxDrawdown

    await this.upsertPortfolioPerf(performance)
    return performance
  }

  async calculateDailyPositionPerformance(positionId: string, date: Date = new Date()): Promise<PositionPerformance> {
    const position = await this.positions.findOne({
      where: { id: positionId },
      relations: ['portfolio']
    })

    if (!position) throw new Error('Position not found')

    const quote = await this.quotes.getQuote(position.symbol)
    const currentPrice = quote.priceCents / 100
    const quantityNum = parseFloat(String(position.quantity))
    const marketValue = quantityNum * currentPrice

    const previousDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1))

    const previousPerf = await this.positionPerf.findOne({
      where: { position_id: positionId, date: previousDate, period_type: 'daily' }
    })

    const previousPrice = previousPerf?.market_price_amount ?? position.avg_cost_amount
    const dailyReturn = previousPrice > 0 ? ((currentPrice - Number(previousPrice)) / Number(previousPrice)) * 100 : 0
    const totalReturn = position.avg_cost_amount > 0 ? ((currentPrice - Number(position.avg_cost_amount)) / Number(position.avg_cost_amount)) * 100 : 0

    const dailyPnL = (currentPrice - Number(previousPrice)) * quantityNum
    const unrealizedPnL = (currentPrice - Number(position.avg_cost_amount)) * quantityNum

    const portfolioValue = await this.calculatePortfolioValue(position.portfolio)
    const weightPercent = portfolioValue.totalValue > 0 ? (marketValue / portfolioValue.totalValue) * 100 : 0

    const performance = new PositionPerformance()
    performance.position_id = positionId
    performance.portfolio_id = position.portfolio_id
    performance.symbol = position.symbol
    performance.date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    performance.period_type = 'daily'
    performance.quantity = String(quantityNum)
    performance.avg_cost_amount = this.round2(Number(position.avg_cost_amount))
    performance.market_price_amount = this.round2(currentPrice)
    performance.market_value_amount = this.round2(marketValue)
    performance.daily_return_percent = this.round4(dailyReturn)
    performance.total_return_percent = this.round4(totalReturn)
    performance.daily_pnl_amount = this.round2(dailyPnL)
    performance.unrealized_pnl_amount = this.round2(unrealizedPnL)
    performance.realized_pnl_amount = this.round2(0)
    performance.weight_percent = this.round4(weightPercent)
    performance.contribution_to_return = this.round4((dailyReturn * weightPercent) / 100)

    await this.upsertPositionPerf(performance)
    return performance
  }

  async calculateDailyGainersLosers(date: Date = new Date(), limit: number = 10) {
    const activeSymbols = await this.positions
      .createQueryBuilder('pos')
      .select('DISTINCT pos.symbol', 'symbol')
      .getRawMany()

    const movers: MarketMovers[] = []

    for (const { symbol } of activeSymbols) {
      try {
        const currentQuote = await this.quotes.getQuote(symbol)
        const currentPrice = currentQuote.priceCents / 100

        const previousDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1))
        const previousPrice = this.round2(currentPrice * (1 - (Math.random() * 0.1 - 0.05)))

        const priceChange = this.round2(currentPrice - previousPrice)
        const priceChangePercent = this.round4(previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0)

        const portfolioData = await this.getSymbolPortfolioImpact(symbol)
        const symbolInfo = await this.symbols.get(symbol)

        const mover = new MarketMovers()
        mover.symbol = symbol
        mover.company_name = symbolInfo?.name || symbol
        mover.date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) as any
        mover.period_type = 'daily'
        mover.mover_type = priceChangePercent >= 0 ? 'gainer' : 'loser'
        mover.current_price_amount = this.round2(currentPrice)
        mover.previous_price_amount = this.round2(previousPrice)
        mover.price_change_amount = this.round2(priceChange)
        mover.price_change_percent = priceChangePercent
        mover.portfolios_holding_count = portfolioData.holdingCount
        mover.total_market_value_amount = this.round2(portfolioData.totalValue)
        mover.avg_portfolio_impact_amount = this.round2(portfolioData.avgImpact)
        mover.rank = 0

        movers.push(mover)
      } catch {}
    }

    const gainers = movers
      .filter((m) => m.mover_type === 'gainer')
      .sort((a, b) => Number(b.price_change_percent) - Number(a.price_change_percent))
      .slice(0, limit)
      .map((m, i) => ({ ...m, rank: i + 1 }))

    const losers = movers
      .filter((m) => m.mover_type === 'loser')
      .sort((a, b) => Number(a.price_change_percent) - Number(b.price_change_percent))
      .slice(0, limit)
      .map((m, i) => ({ ...m, rank: i + 1 }))

    await this.marketMovers.delete({ date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) as any, period_type: 'daily' })
    await this.marketMovers.save([...gainers, ...losers])

    return { gainers, losers }
  }

  async getPortfolioAnalytics(portfolioId: string, days: number = 30) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const performance = await this.portfolioPerf.find({
      where: {
        portfolio_id: portfolioId,
        date: Between(new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())), new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()))),
        period_type: 'daily',
      },
      order: { date: 'ASC' },
    })

    return {
      performance,
      summary: this.calculateSummaryStats(performance),
    }
  }

  async getPositionAnalytics(portfolioId: string, days: number = 30) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const performance = await this.positionPerf.find({
      where: {
        portfolio_id: portfolioId,
        date: Between(new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())), new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()))),
        period_type: 'daily',
      },
      order: { date: 'ASC', symbol: 'ASC' },
    })

    return this.groupPositionPerformanceBySymbol(performance)
  }

  async getGainersLosers(period: 'daily' | 'weekly' = 'daily', date: Date = new Date()) {
    const gainers = await this.marketMovers.find({
      where: { date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) as any, period_type: period, mover_type: 'gainer' },
      order: { rank: 'ASC' },
      take: 10,
    })

    const losers = await this.marketMovers.find({
      where: { date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) as any, period_type: period, mover_type: 'loser' },
      order: { rank: 'ASC' },
      take: 10,
    })

    return { gainers, losers }
  }

  private async calculatePortfolioValue(portfolio: Portfolio): Promise<{ totalValue: number; cashAmount: number; positionsValue: number }> {
    const participant = await this.participants.findOne({ where: { id: portfolio.participant_id } })
    if (!participant) throw new Error('Participant not found')

    const cashAmount = parseFloat(String(participant.current_cash_amount))
    let positionsValue = 0

    const positions = await this.positions.find({ where: { portfolio_id: portfolio.id } })

    for (const position of positions) {
      const quote = await this.quotes.getQuote(position.symbol)
      const currentPrice = quote.priceCents / 100
      positionsValue += parseFloat(String(position.quantity)) * currentPrice
    }

    const totalValue = cashAmount + positionsValue
    return { totalValue: this.round2(totalValue), cashAmount: this.round2(cashAmount), positionsValue: this.round2(positionsValue) }
  }

  private async calculateRiskMetrics(portfolioId: string, date: Date): Promise<{ volatility: number | null; sharpeRatio: number | null; maxDrawdown: number | null }> {
    const thirtyDaysAgo = new Date(date)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const history = await this.portfolioPerf.find({
      where: { portfolio_id: portfolioId, date: Between(thirtyDaysAgo, date), period_type: 'daily' },
      order: { date: 'ASC' },
    })

    if (history.length < 10) {
      return { volatility: null, sharpeRatio: null, maxDrawdown: null }
    }

    const returns = history.map((h) => Number(h.daily_return_percent))
    const volatility = this.calculateVolatility(returns)
    const sharpeRatio = this.calculateSharpeRatio(returns)
    const maxDrawdown = this.calculateMaxDrawdown(history.map((h) => Number(h.total_value_amount)))

    return { volatility, sharpeRatio, maxDrawdown }
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    return Math.sqrt(variance) * Math.sqrt(252)
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.06): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const volatility = this.calculateVolatility(returns)
    const dailyRiskFreeRate = riskFreeRate / 252
    return (mean - dailyRiskFreeRate) / (volatility / Math.sqrt(252))
  }

  private calculateMaxDrawdown(values: number[]): number {
    let maxDrawdown = 0
    let peak = values[0]
    for (const value of values) {
      if (value > peak) peak = value
      const drawdown = ((peak - value) / peak) * 100
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }
    return maxDrawdown
  }

  private async getSymbolPortfolioImpact(symbol: string) {
    const positions = await this.positions.find({ where: { symbol } })
    let totalValue = 0
    const holdingCount = positions.length

    for (const position of positions) {
      const quote = await this.quotes.getQuote(symbol)
      const currentPrice = quote.priceCents / 100
      totalValue += parseFloat(String(position.quantity)) * currentPrice
    }

    const avgImpact = holdingCount > 0 ? totalValue / holdingCount : 0

    return { holdingCount, totalValue: this.round2(totalValue), avgImpact: this.round2(avgImpact) }
  }

  private calculateSummaryStats(performance: PortfolioPerformance[]) {
    if (performance.length === 0) return null
    const returns = performance.map((p) => Number(p.daily_return_percent))
    const totalReturn = Number(performance[performance.length - 1]?.cumulative_return_percent || 0)
    const avgDailyReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const volatility = this.calculateVolatility(returns)
    const sharpeRatio = this.calculateSharpeRatio(returns)
    const maxValue = Math.max(...performance.map((p) => Number(p.total_value_amount)))
    const minValue = Math.min(...performance.map((p) => Number(p.total_value_amount)))
    const currentValue = Number(performance[performance.length - 1]?.total_value_amount || 0)

    return {
      totalReturn: this.round4(totalReturn),
      avgDailyReturn: this.round4(avgDailyReturn),
      volatility: this.round4(volatility),
      sharpeRatio: this.round4(sharpeRatio),
      maxValue: this.round2(maxValue),
      minValue: this.round2(minValue),
      currentValue: this.round2(currentValue),
      bestDay: this.round4(Math.max(...returns)),
      worstDay: this.round4(Math.min(...returns)),
    }
  }

  private groupPositionPerformanceBySymbol(performance: PositionPerformance[]) {
    const grouped = performance.reduce((acc, perf) => {
      if (!acc[perf.symbol]) acc[perf.symbol] = []
      acc[perf.symbol].push(perf)
      return acc
    }, {} as Record<string, PositionPerformance[]>)

    return Object.entries(grouped).map(([symbol, data]) => ({
      symbol,
      performance: data,
      summary: {
        currentReturn: Number(data[data.length - 1]?.total_return_percent || 0),
        currentValue: Number(data[data.length - 1]?.market_value_amount || 0),
        avgWeight: this.round4(data.reduce((sum, d) => sum + Number(d.weight_percent || 0), 0) / data.length),
      },
    }))
  }
} 