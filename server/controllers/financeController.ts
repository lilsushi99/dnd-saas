import { Request, Response } from 'express';
import { FinanceService } from '../services/financeService';
import { ExpenseRepository } from '../repositories/expenseRepository';

const expenseRepo = new ExpenseRepository();
const financeService = new FinanceService(expenseRepo);

export class FinanceController {
  public static async getAnalytics(req: Request, res: Response) {
    try {
      const { period, startDate, endDate, branch } = req.query;
      const analytics = await financeService.getFinanceAnalytics({
        period: period as any,
        startDate: startDate as string,
        endDate: endDate as string,
        branch: branch as string,
      });

      return res.json({ success: true, analytics });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
