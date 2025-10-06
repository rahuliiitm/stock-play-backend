import { Injectable } from '@nestjs/common';
import { ExitStrategy } from './exit-strategy.interface';
import { FifoExitStrategy } from './fifo-exit-strategy';
import { LifoExitStrategy } from './lifo-exit-strategy';

/**
 * Exit Strategy Factory
 * 
 * Factory pattern implementation for creating exit strategies
 * Follows SOLID principles - Open/Closed Principle
 * Easy to extend with new exit strategies without modifying existing code
 */
@Injectable()
export class ExitStrategyFactory {
  
  constructor(
    private readonly fifoExitStrategy: FifoExitStrategy,
    private readonly lifoExitStrategy: LifoExitStrategy,
  ) {}

  /**
   * Create exit strategy based on configuration
   * @param exitMode - The exit mode ('FIFO' | 'LIFO')
   * @returns The appropriate exit strategy instance
   */
  createExitStrategy(exitMode: 'FIFO' | 'LIFO'): ExitStrategy {
    switch (exitMode) {
      case 'FIFO':
        return this.fifoExitStrategy;
      case 'LIFO':
        return this.lifoExitStrategy;
      default:
        throw new Error(`Unsupported exit mode: ${exitMode}`);
    }
  }

  /**
   * Get all available exit strategies
   * @returns Array of available exit strategy names
   */
  getAvailableStrategies(): string[] {
    return ['FIFO', 'LIFO'];
  }
}

