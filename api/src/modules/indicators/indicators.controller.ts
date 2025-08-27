import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common'
import { IndicatorCalculationService } from './indicator-calculation.service'
import { IndicatorConfig } from './indicator-config.entity'
import { IndicatorValue } from './indicator-value.entity'

@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly indicatorService: IndicatorCalculationService) {}

  @Get('available')
  getAvailableIndicators() {
    return this.indicatorService.getAvailableIndicators()
  }

  @Get('configs/:symbol')
  getIndicatorConfigs(@Param('symbol') symbol: string) {
    return this.indicatorService.getIndicatorConfigs(symbol)
  }

  @Post('configs/:symbol')
  async addIndicatorConfig(
    @Param('symbol') symbol: string,
    @Body() body: {
      indicatorName: string
      parameters: Record<string, any>
      description?: string
    }
  ) {
    return this.indicatorService.addIndicatorConfig(
      symbol,
      body.indicatorName,
      body.parameters,
      body.description
    )
  }

  @Put('configs/:id')
  async updateIndicatorConfig(
    @Param('id') id: string,
    @Body() updates: Partial<IndicatorConfig>
  ) {
    return this.indicatorService.updateIndicatorConfig(id, updates)
  }

  @Delete('configs/:id')
  async removeIndicatorConfig(@Param('id') id: string) {
    await this.indicatorService.removeIndicatorConfig(id)
    return { message: 'Indicator config removed successfully' }
  }

  @Get('values/:symbol/:indicatorName')
  async getLatestIndicatorValue(
    @Param('symbol') symbol: string,
    @Param('indicatorName') indicatorName: string
  ) {
    return this.indicatorService.getLatestIndicatorValue(symbol, indicatorName)
  }

  @Get('values/:symbol')
  async getLatestIndicatorValues(@Param('symbol') symbol: string) {
    return this.indicatorService.getLatestIndicatorValues(symbol)
  }

  @Get('history/:symbol/:indicatorName')
  async getIndicatorHistory(
    @Param('symbol') symbol: string,
    @Param('indicatorName') indicatorName: string,
    @Query('limit') limit: string = '100'
  ) {
    return this.indicatorService.getIndicatorHistory(
      symbol,
      indicatorName,
      parseInt(limit, 10)
    )
  }

  @Post('calculate/:symbol/:indicatorName')
  async calculateIndicator(
    @Param('symbol') symbol: string,
    @Param('indicatorName') indicatorName: string,
    @Body() parameters: Record<string, any> = {}
  ) {
    return this.indicatorService.calculateIndicator(symbol, indicatorName, parameters)
  }

  @Post('calculate/:symbol')
  async calculateAllIndicatorsForSymbol(@Param('symbol') symbol: string) {
    return this.indicatorService.calculateAllIndicatorsForSymbol(symbol)
  }

  @Post('calculate-all')
  async calculateAllIndicators() {
    await this.indicatorService.calculateAllIndicators()
    return { message: 'All indicators calculation started' }
  }
}
