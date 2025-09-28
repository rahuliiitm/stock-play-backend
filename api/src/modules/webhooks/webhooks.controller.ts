import { Body, Controller, Post } from '@nestjs/common';

@Controller('webhooks')
export class WebhooksController {
  @Post('stripe')
  stripe(@Body() _event: any) {
    // Accept and return 200
    return { received: true };
  }
}
