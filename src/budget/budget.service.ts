// src/budget/budget.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ActiveUserInterface } from '../common/interface/activeUserInterface';
import { Category } from '../category/entities/category.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { addDays, differenceInDays } from 'date-fns';
import { Period } from '../common/enum/period.enum';

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async create(
    createBudgetDto: CreateBudgetDto,
    user: ActiveUserInterface,
  ): Promise<Omit<Budget, 'user' | 'category'>> {
    const { amount, categoryId, period } = createBudgetDto;

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['user'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    if (category.user && category.user.id !== user.id) {
      throw new BadRequestException('Unauthorized access to custom category');
    }

    const startDate = new Date();
    const endDate =
      period === Period.MONTHLY
        ? addDays(startDate, 30)
        : addDays(startDate, 15);

    const wallet = await this.walletRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (!wallet || wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance in wallet');
    }

    const budget = this.budgetRepository.create({
      amount,
      startDate,
      endDate,
      period,
      category,
      user,
    });

    wallet.balance -= amount;
    await this.walletRepository.save(wallet);

    const savedBudget = await this.budgetRepository.save(budget);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user: _, category: __, ...budgetWithoutRelations } = savedBudget;

    return budgetWithoutRelations;
  }

  async getStats(budgetId: string, user: ActiveUserInterface) {
    const budget = await this.budgetRepository.findOne({
      where: { id: budgetId, user: { id: user.id } },
      relations: ['category'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    const transactions = await this.transactionRepository.find({
      where: { category: { id: budget.category.id }, user: { id: user.id } },
    });

    const totalSpent = transactions.reduce(
      (total, transaction) => total + parseFloat(transaction.amount.toString()),
      0,
    );

    const remainingAmount = budget.amount - totalSpent;

    const usedPercentage = Math.min(
      100,
      Math.max(0, (totalSpent / budget.amount) * 100),
    );
    const remainingPercentage = Math.min(
      100,
      Math.max(0, (remainingAmount / budget.amount) * 100),
    );

    const totalTransactions = transactions.length;
    const averageSpentPerTransaction =
      totalTransactions > 0 ? totalSpent / totalTransactions : 0;
    const daysRemaining = differenceInDays(
      new Date(budget.endDate),
      new Date(),
    );
    const daysElapsed = differenceInDays(
      new Date(),
      new Date(budget.startDate),
    );
    const dailySpendingRate = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    const averageDailySpending = daysElapsed > 0 ? totalSpent / daysElapsed : 0;

    return {
      totalBudgetAmount: budget.amount,
      totalAmountSpent: Number(totalSpent.toFixed(2)),
      remainingBudgetAmount: Number(remainingAmount.toFixed(2)),
      percentageBudgetUsed: Number(usedPercentage.toFixed(2)),
      percentageBudgetRemaining: Number(remainingPercentage.toFixed(2)),
      totalTransactions,
      averageSpentPerTransaction: Number(averageSpentPerTransaction.toFixed(2)),
      daysRemaining,
      dailySpendingRate: Number(dailySpendingRate.toFixed(2)),
      averageDailySpending: Number(averageDailySpending.toFixed(2)),
    };
  }
}
