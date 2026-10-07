import {
  Body,
  Controller,
  Delete,
  Get,
  Global,
  HttpCode,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  expenseCreateSchema,
  expenseQuerySchema,
  expenseUpdateSchema,
  isoDateSchema,
  type ExpenseCreateInput,
  type ExpenseQuery,
  type ExpenseUpdateInput,
} from '@routeflow/types';
import { CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { ExpensesService } from './expenses.service';

const summaryQuery = z.object({
  date: isoDateSchema.optional(),
  employeeId: z.string().uuid().optional(),
});

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@Query(new ZodPipe(expenseQuerySchema)) query: ExpenseQuery, @CurrentUser() user: AuthUser) {
    return this.expenses.list(query, user);
  }

  @Get('summary')
  summary(
    @Query(new ZodPipe(summaryQuery)) query: z.infer<typeof summaryQuery>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenses.summary(user, query.date, query.employeeId);
  }

  @Post()
  create(
    @Body(new ZodPipe(expenseCreateSchema)) body: ExpenseCreateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenses.create(body, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(expenseUpdateSchema)) body: ExpenseUpdateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenses.update(id, body, user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.expenses.remove(id, user);
  }
}

@Global()
@Module({
  providers: [ExpensesService],
  controllers: [ExpensesController],
  exports: [ExpensesService],
})
export class ExpensesModule {}
