import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { IndicatorCalculationService } from './indicator-calculation.service';
import { IndicatorConfig } from './indicator-config.entity';
import { IndicatorValue } from './indicator-value.entity';
import type { TimeframeType } from '../trading/schemas/candle.schema';

@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly indicatorService: IndicatorCalculationService) {}

  @Get('available')
  getAvailableIndicators() {
    return this.indicatorService.getAvailableIndicators();
  }

  @Get('configs/:symbol')
  getIndicatorConfigs(@Param('symbol') symbol: string) {
    return this.indicatorService.getIndicatorConfigs(symbol);
  }

  @Post('configs/:symbol')
  async addIndicatorConfig(
    @Param('symbol') symbol: string,
    @Body()
    body: {
      indicatorName: string;
      parameters: Record<string, any>;
      description?: string;
    },
  ) {
    return this.indicatorService.addIndicatorConfig(
      symbol,
      body.indicatorName,
      body.parameters,
      body.description,
    );
  }

  @Put('configs/:id')
  async updateIndicatorConfig(
    @Param('id') id: string,
    @Body() updates: Partial<IndicatorConfig>,
  ) {
    return this.indicatorService.updateIndicatorConfig(id, updates);
  }

  @Delete('configs/:id')
  async removeIndicatorConfig(@Param('id') id: string) {
    await this.indicatorService.removeIndicatorConfig(id);
    return { message: 'Indicator config removed successfully' };
  }

  @Get('values/:symbol/:indicatorName')
  async getLatestIndicatorValue(
    @Param('symbol') symbol: string,
    @Param('indicatorName') indicatorName: string,
  ) {
    return this.indicatorService.getLatestIndicatorValue(symbol, indicatorName);
  }

  @Get('values/:symbol')
  async getLatestIndicatorValues(@Param('symbol') symbol: string) {
    return this.indicatorService.getLatestIndicatorValues(symbol);
  }

  @Get('history/:symbol/:indicatorName')
  async getIndicatorHistory(
    @Param('symbol') symbol: string,
    @Param('indicatorName') indicatorName: string,
    @Query('limit') limit: string = '100',
  ) {
    return this.indicatorService.getIndicatorHistory(
      symbol,
      indicatorName,
      parseInt(limit, 10),
    );
  }

  @Post('calculate/:symbol/:indicatorName')
  async calculateIndicator(
    @Param('symbol') symbol: string,
    @Param('indicatorName') indicatorName: string,
    @Body() parameters: Record<string, any> = {},
  ) {
    return this.indicatorService.calculateIndicator(
      symbol,
      indicatorName,
      parameters,
    );
  }

  @Post('calculate/:symbol')
  async calculateAllIndicatorsForSymbol(@Param('symbol') symbol: string) {
    return this.indicatorService.calculateAllIndicatorsForSymbol(symbol);
  }

  @Post('calculate-all')
  async calculateAllIndicators() {
    await this.indicatorService.calculateAllIndicators();
    return { message: 'All indicators calculation started' };
  }

  // Supertrend-specific endpoints
  @Post('supertrend/:symbol')
  async calculateSupertrend(
    @Param('symbol') symbol: string,
    @Body()
    body: {
      period?: number;
      multiplier?: number;
      timeframe?: TimeframeType;
    } = {},
  ) {
    const { period = 10, multiplier = 3, timeframe } = body;

    if (timeframe) {
      // Calculate using trading module's data for specific timeframe
      const results =
        await this.indicatorService.calculateIndicatorsWithTradingData(
          symbol,
          [timeframe],
          ['SUPERTREND'],
        );
      return results.length > 0
        ? results[0]
        : { message: 'No Supertrend data calculated' };
    } else {
      // Calculate using regular historical data
      return this.indicatorService.calculateIndicator(symbol, 'SUPERTREND', {
        period,
        multiplier,
      });
    }
  }

  // Trading module integration endpoints
  @Post('trading/:symbol')
  async calculateIndicatorsWithTradingData(
    @Param('symbol') symbol: string,
    @Body()
    body: {
      timeframes: TimeframeType[];
      indicatorNames?: string[];
    },
  ) {
    const { timeframes, indicatorNames = [] } = body;
    return this.indicatorService.calculateIndicatorsWithTradingData(
      symbol,
      timeframes,
      indicatorNames,
    );
  }

  @Get('trading/:symbol/:timeframe/:indicatorName')
  async getTradingIndicatorValue(
    @Param('symbol') symbol: string,
    @Param('timeframe') timeframe: TimeframeType,
    @Param('indicatorName') indicatorName: string,
  ) {
    // Get the latest indicator value for the specific timeframe
    // This would need to be implemented in the service to filter by timeframe
    const latestValue = await this.indicatorService.getLatestIndicatorValue(
      symbol,
      indicatorName,
    );
    if (latestValue && latestValue.interval === timeframe) {
      return latestValue;
    }
    return {
      message: `No ${indicatorName} data found for ${symbol} on ${timeframe} timeframe`,
    };
  }
}
