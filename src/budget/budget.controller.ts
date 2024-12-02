import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { ActiveUserInterface } from '../common/interface/activeUserInterface';
import { AuthGuard } from '../auth/guard/auth.guard';

@Controller('budget')
@UseGuards(AuthGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  async create(
    @Body() createBudgetDto: CreateBudgetDto,
    @ActiveUser() user: ActiveUserInterface,
  ) {
    return this.budgetService.create(createBudgetDto, user);
  }

  @Get('stats/:budgetId') async getStats(
    @Param('budgetId') budgetId: string,
    @ActiveUser() user: ActiveUserInterface,
  ) {
    return this.budgetService.getStats(budgetId, user);
  }
}
