import { OperationsRepository } from '../repositories/operationsRepository';
import { AdminRepository } from '../repositories/adminRepository';
import { Booking, DailyLoggerSummary, FacilityRecordSummary, SystemSettings } from '../../src/types';

export class OperationsService {
  private adminRepository = new AdminRepository();

  constructor(private repository: OperationsRepository) {}

  public async getBookings(branch?: string, month?: string, search?: string): Promise<Booking[]> {
    return await this.repository.getBookings({ branch, month, search });
  }

  public async getSummaryMetrics(branch?: string, month?: string): Promise<DailyLoggerSummary> {
    const bookings = await this.getBookings(branch, month);

    const monthlyRevenue = bookings.reduce((sum, b) => sum + b.amount, 0);
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter((b) => b.status === 'Active').length;
    const expiredBookings = bookings.filter((b) => b.status === 'Expired').length;

    return {
      monthlyRevenue,
      totalBookings,
      activeBookings,
      expiredBookings,
      activeSubscriptions: activeBookings,
      expiredSubscriptions: expiredBookings,
    };
  }

  public async getFacilityRecords(filters?: {
    branch?: string;
    dateFilter?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FacilityRecordSummary[]> {
    return await this.repository.getFacilityRecords(filters);
  }

  public async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> {
    const daysUsed = bookingData.daysUsed ?? 1;
    const daysLeft = Math.max(0, (bookingData.daysCount || 1) - daysUsed);
    const status = daysLeft > 0 ? 'Active' : 'Expired';

    const processedData = {
      ...bookingData,
      daysUsed,
      daysLeft,
      status: bookingData.status || status,
    };

    return await this.repository.addBooking(processedData);
  }

  public async updateBooking(id: string, bookingData: Partial<Booking>): Promise<Booking> {
    return await this.repository.updateBooking(id, bookingData);
  }

  public async getNextBookingId(): Promise<string> {
    return await this.repository.getNextBookingId();
  }

  public async getSettings(): Promise<SystemSettings> {
    return await this.repository.getSettings();
  }

  public async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return await this.repository.updateSettings(settings);
  }

  public async getProfileSettings(userId?: string) {
    return await this.repository.getProfileSettings(userId);
  }

  public async updateProfileSettings(data: {
    userId?: string;
    profileName: string;
    profileEmail: string;
    profilePhone: string;
    profilePhoto?: string;
  }) {
    return await this.repository.updateProfileSettings(data);
  }

  public async searchClients(query?: string) {
    return await this.repository.getClients(query);
  }
}
