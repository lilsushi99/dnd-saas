import { Request, Response } from 'express';
import { CustomerService } from '../services/customerService';
import { CustomerRepository } from '../repositories/customerRepository';

const repo = new CustomerRepository();
const service = new CustomerService(repo);

export class CustomerController {
  public static async getCustomers(req: Request, res: Response) {
    try {
      const { search, branch, dateRange, sort, status } = req.query;
      const result = await service.getCustomers({
        search: search as string,
        branch: branch as string,
        dateRange: dateRange as string,
        sort: sort as any,
        status: status as string,
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getCustomerById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await service.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      return res.json({ success: true, customer });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getActiveSubscriptions(req: Request, res: Response) {
    try {
      const { branch, facility, daysRemaining, date, search } = req.query;
      const subscriptions = await service.getActiveSubscriptions({
        branch: branch as string,
        facility: facility as string,
        daysRemaining: daysRemaining as string,
        date: date as string,
        search: search as string,
      });

      return res.json({ success: true, subscriptions });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Stubs for prepared future communication endpoints
  public static async sendWhatsApp(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const result = await service.sendWhatsAppMessage(id, message);
      return res.json({ success: true, message: 'WhatsApp integration endpoint prepared.', data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async sendEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { subject, body } = req.body;
      const result = await service.sendEmailCampaign(id, subject, body);
      return res.json({ success: true, message: 'Email integration endpoint prepared.', data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async sendNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const result = await service.sendNotification(id, payload);
      return res.json({ success: true, message: 'Notification integration endpoint prepared.', data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
