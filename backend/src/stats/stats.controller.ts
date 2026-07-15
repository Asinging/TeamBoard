import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(@CurrentUser() user: { _id: string }) {
    return this.statsService.getForUser(user._id);
  }
}
