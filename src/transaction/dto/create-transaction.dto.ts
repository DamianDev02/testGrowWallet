import { IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  amount: number;

  @IsUUID()
  budgetId: string;

  @IsOptional()
  description?: string;
}
