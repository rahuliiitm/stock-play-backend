import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  @Get('db-test')
  async getDbTest() {
    try {
      // This will be implemented by the portfolio scheduler service
      return {
        message: 'Database connection test',
        timestamp: new Date().toISOString(),
        status: 'Database connection available'
      };
    } catch (error) {
      return {
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }


}
