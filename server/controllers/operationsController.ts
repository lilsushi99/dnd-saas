import { Request, Response } from 'express';
import { OperationsService } from '../services/operationsService';
import { OperationsRepository } from '../repositories/operationsRepository';

const repo = new OperationsRepository();
const service = new OperationsService(repo);

export class OperationsController {
  public static async getBookings(req: Request, res: Response) {
    try {
      const { branch, month, search } = req.query;
      const bookings = await service.getBookings(
        branch as string,
        month as string,
        search as string
      );
      const summary = await service.getSummaryMetrics(branch as string, month as string);
      return res.json({ success: true, bookings, summary });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getFacilityRecords(req: Request, res: Response) {
    try {
      const { branch, dateFilter, startDate, endDate } = req.query;
      const records = await service.getFacilityRecords({
        branch: branch as string,
        dateFilter: dateFilter as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });
      return res.json({ success: true, records });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createBooking(req: Request, res: Response) {
    try {
      const newBooking = await service.createBooking(req.body);
      return res.status(201).json({ success: true, booking: newBooking });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async updateBooking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedBooking = await service.updateBooking(id, req.body);
      return res.json({ success: true, booking: updatedBooking });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async searchClients(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const clients = await service.searchClients(q as string);
      return res.json({ success: true, clients });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getNextBookingId(req: Request, res: Response) {
    try {
      const nextId = await service.getNextBookingId();
      return res.json({ success: true, nextId });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getSettings(req: Request, res: Response) {
    try {
      const settings = await service.getSettings();
      return res.json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateSettings(req: Request, res: Response) {
    try {
      const settings = await service.updateSettings(req.body);
      return res.json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getProfileSettings(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string | undefined;
      const profile = await service.getProfileSettings(userId);
      return res.json({ success: true, profile });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateProfileSettings(req: Request, res: Response) {
    try {
      const profile = await service.updateProfileSettings(req.body);
      return res.json({ success: true, profile });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
