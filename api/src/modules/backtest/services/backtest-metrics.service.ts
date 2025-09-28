import { Injectable, Logger } from '@nestjs/common';
import { BacktestResult } from '../interfaces/backtest-config.interface';

export interface RiskMetrics {
  maxDrawdown: number;
  maxDrawdownDuration: number;
  var95: number;
  var99: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  recoveryFactor: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface TradeAnalysis {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  avgTradeDuration: number;
  maxTradeDuration: number;
  minTradeDuration: number;
  tradesPerDay: number;
  tradesPerWeek: number;
  tradesPerMonth: number;
}

/**
 * Backtest Metrics Service
 *
 * This service calculates comprehensive performance and risk metrics
 * for backtest results. It provides detailed analysis of trading
 * performance and risk characteristics.
 */
@Injectable()
export class BacktestMetricsService {
  private readonly logger = new Logger(BacktestMetricsService.name);

  /**
   * Calculate comprehensive metrics for backtest results
   */
  calculateMetrics(result: BacktestResult): {
    risk: RiskMetrics;
    performance: PerformanceMetrics;
    tradeAnalysis: TradeAnalysis;
  } {
    this.logger.log('Calculating comprehensive backtest metrics');

    const risk = this.calculateRiskMetrics(result);
    const performance = this.calculatePerformanceMetrics(result);
    const tradeAnalysis = this.calculateTradeAnalysis(result);

    return {
      risk,
      performance,
      tradeAnalysis,
    };
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(result: BacktestResult): RiskMetrics {
    const equityCurve = result.equityCurve;
    const returns = this.calculateReturns(equityCurve);

    return {
      maxDrawdown: result.maxDrawdown,
      maxDrawdownDuration: this.calculateMaxDrawdownDuration(equityCurve),
      var95: this.calculateVaR(returns, 0.95),
      var99: this.calculateVaR(returns, 0.99),
      sharpeRatio: result.sharpeRatio,
      sortinoRatio: this.calculateSortinoRatio(returns),
      calmarRatio: this.calculateCalmarRatio(
        result.totalReturnPercentage,
        result.maxDrawdown,
      ),
      recoveryFactor: this.calculateRecoveryFactor(
        result.totalReturn,
        result.maxDrawdown,
      ),
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    result: BacktestResult,
  ): PerformanceMetrics {
    const equityCurve = result.equityCurve;
    const returns = this.calculateReturns(equityCurve);
    const trades = result.trades;

    return {
      totalReturn: result.totalReturnPercentage,
      annualizedReturn: this.calculateAnnualizedReturn(equityCurve),
      volatility: this.calculateVolatility(returns),
      winRate: result.winRate,
      profitFactor: result.profitFactor,
      averageWin: result.averageWin,
      averageLoss: result.averageLoss,
      largestWin: this.calculateLargestWin(trades),
      largestLoss: this.calculateLargestLoss(trades),
      consecutiveWins: this.calculateConsecutiveWins(trades),
      consecutiveLosses: this.calculateConsecutiveLosses(trades),
    };
  }

  /**
   * Calculate trade analysis
   */
  private calculateTradeAnalysis(result: BacktestResult): TradeAnalysis {
    const trades = result.trades;
    const equityCurve = result.equityCurve;

    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakEvenTrades: 0,
        avgTradeDuration: 0,
        maxTradeDuration: 0,
        minTradeDuration: 0,
        tradesPerDay: 0,
        tradesPerWeek: 0,
        tradesPerMonth: 0,
      };
    }

    const durations = trades.map((t) => t.duration).filter((d) => d > 0);
    const totalDays = this.calculateTotalDays(equityCurve);

    return {
      totalTrades: trades.length,
      winningTrades: trades.filter((t) => t.pnl > 0).length,
      losingTrades: trades.filter((t) => t.pnl < 0).length,
      breakEvenTrades: trades.filter((t) => t.pnl === 0).length,
      avgTradeDuration:
        durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0,
      maxTradeDuration: durations.length > 0 ? Math.max(...durations) : 0,
      minTradeDuration: durations.length > 0 ? Math.min(...durations) : 0,
      tradesPerDay: totalDays > 0 ? trades.length / totalDays : 0,
      tradesPerWeek: totalDays > 0 ? trades.length / (totalDays / 7) : 0,
      tradesPerMonth: totalDays > 0 ? trades.length / (totalDays / 30) : 0,
    };
  }

  /**
   * Calculate returns from equity curve
   */
  private calculateReturns(equityCurve: any[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const returnRate =
        (equityCurve[i].equity - equityCurve[i - 1].equity) /
        equityCurve[i - 1].equity;
      returns.push(returnRate);
    }
    return returns;
  }

  /**
   * Calculate maximum drawdown duration
   */
  private calculateMaxDrawdownDuration(equityCurve: any[]): number {
    let maxDuration = 0;
    let currentDuration = 0;
    let peak = equityCurve[0]?.equity || 0;

    for (const point of equityCurve) {
      if (point.equity > peak) {
        peak = point.equity;
        currentDuration = 0;
      } else {
        currentDuration++;
        maxDuration = Math.max(maxDuration, currentDuration);
      }
    }

    return maxDuration;
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return sortedReturns[index] || 0;
  }

  /**
   * Calculate Sortino ratio
   */
  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const averageReturn =
      returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const negativeReturns = returns.filter((r) => r < 0);

    if (negativeReturns.length === 0) return 0;

    const downsideDeviation = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + r * r, 0) /
        negativeReturns.length,
    );

    return downsideDeviation === 0 ? 0 : averageReturn / downsideDeviation;
  }

  /**
   * Calculate Calmar ratio
   */
  private calculateCalmarRatio(
    annualizedReturn: number,
    maxDrawdown: number,
  ): number {
    return maxDrawdown === 0 ? 0 : annualizedReturn / maxDrawdown;
  }

  /**
   * Calculate recovery factor
   */
  private calculateRecoveryFactor(
    totalReturn: number,
    maxDrawdown: number,
  ): number {
    return maxDrawdown === 0 ? 0 : totalReturn / maxDrawdown;
  }

  /**
   * Calculate annualized return
   */
  private calculateAnnualizedReturn(equityCurve: any[]): number {
    if (equityCurve.length < 2) return 0;

    const startEquity = equityCurve[0].equity;
    const endEquity = equityCurve[equityCurve.length - 1].equity;
    const totalReturn = (endEquity - startEquity) / startEquity;

    const startDate = new Date(equityCurve[0].timestamp);
    const endDate = new Date(equityCurve[equityCurve.length - 1].timestamp);
    const years =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    return years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;

    const averageReturn =
      returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) /
      returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate largest win
   */
  private calculateLargestWin(trades: any[]): number {
    const winningTrades = trades.filter((t) => t.pnl > 0);
    return winningTrades.length > 0
      ? Math.max(...winningTrades.map((t) => t.pnl))
      : 0;
  }

  /**
   * Calculate largest loss
   */
  private calculateLargestLoss(trades: any[]): number {
    const losingTrades = trades.filter((t) => t.pnl < 0);
    return losingTrades.length > 0
      ? Math.min(...losingTrades.map((t) => t.pnl))
      : 0;
  }

  /**
   * Calculate consecutive wins
   */
  private calculateConsecutiveWins(trades: any[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of trades) {
      if (trade.pnl > 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  /**
   * Calculate consecutive losses
   */
  private calculateConsecutiveLosses(trades: any[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of trades) {
      if (trade.pnl < 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  /**
   * Calculate total days in backtest
   */
  private calculateTotalDays(equityCurve: any[]): number {
    if (equityCurve.length < 2) return 0;

    const startDate = new Date(equityCurve[0].timestamp);
    const endDate = new Date(equityCurve[equityCurve.length - 1].timestamp);

    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  }

  /**
   * Generate performance summary
   */
  generatePerformanceSummary(metrics: {
    risk: RiskMetrics;
    performance: PerformanceMetrics;
    tradeAnalysis: TradeAnalysis;
  }): string {
    const { risk, performance, tradeAnalysis } = metrics;

    return `
📊 BACKTEST PERFORMANCE SUMMARY
═══════════════════════════════════════

💰 RETURNS
• Total Return: ${performance.totalReturn.toFixed(2)}%
• Annualized Return: ${(performance.annualizedReturn * 100).toFixed(2)}%
• Volatility: ${(performance.volatility * 100).toFixed(2)}%

📈 RISK METRICS
• Max Drawdown: ${(risk.maxDrawdown * 100).toFixed(2)}%
• Sharpe Ratio: ${risk.sharpeRatio.toFixed(2)}
• Sortino Ratio: ${risk.sortinoRatio.toFixed(2)}
• VaR (95%): ${(risk.var95 * 100).toFixed(2)}%

📊 TRADE ANALYSIS
• Total Trades: ${tradeAnalysis.totalTrades}
• Win Rate: ${(performance.winRate * 100).toFixed(2)}%
• Profit Factor: ${performance.profitFactor.toFixed(2)}
• Avg Win: ₹${performance.averageWin.toFixed(2)}
• Avg Loss: ₹${performance.averageLoss.toFixed(2)}

⚠️ RISK WARNINGS
${risk.maxDrawdown > 0.2 ? '• High drawdown risk (>20%)' : ''}
${performance.profitFactor < 1 ? '• Unprofitable strategy (PF < 1)' : ''}
${tradeAnalysis.totalTrades < 30 ? '• Limited trade sample (<30 trades)' : ''}
    `.trim();
  }
}
