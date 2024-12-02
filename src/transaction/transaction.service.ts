// src/transaction/transaction.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ActiveUserInterface } from '../common/interface/activeUserInterface';
import { Budget } from '../budget/entities/budget.entity';
import { Wallet } from '../wallet/entities/wallet.entity';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
    user: ActiveUserInterface,
  ): Promise<Transaction> {
    const { amount, budgetId, description } = createTransactionDto;

    // Busca la wallet usando el walletId del usuario
    const wallet = await this.walletRepository.findOne({
      where: { id: user.walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${user.walletId} not found`);
    }

    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance in wallet');
    }

    // Busca el presupuesto usando el budgetId y verifica que pertenezca al usuario
    const budget = await this.budgetRepository.findOne({
      where: { id: budgetId, user: { id: user.id } },
      relations: ['user', 'category'], // Elimina 'wallet'
    });

    console.log('Budget:', budget);

    if (!budget) {
      throw new NotFoundException(
        `Budget with ID ${budgetId} not found or does not belong to the user`,
      );
    }

    if (budget.amount < budget.spentAmount + amount) {
      throw new BadRequestException('Amount exceeds budget limit');
    }

    // Actualiza el balance de la wallet y el gasto del presupuesto
    wallet.balance -= amount;
    budget.spentAmount += amount;

    // Crea la transacción
    const transaction = this.transactionRepository.create({
      amount,
      date: new Date(),
      wallet,
      category: budget.category,
      user,
      description,
    });

    await this.walletRepository.save(wallet);
    await this.budgetRepository.save(budget);

    return this.transactionRepository.save(transaction);
  }
}
