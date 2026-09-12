import { Booking, DailyLoggerSummary, FacilityRecordSummary, ClientSuggestion, SystemSettings, ProfileSettings } from '../types';

export class OperationsApiService {
  private static async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  }

  public static async fetchBookings(params?: {
    branch?: string;
    month?: string;
    search?: string;
  }): Promise<{ bookings: Booking[]; summary: DailyLoggerSummary }> {
    const query = new URLSearchParams();
    if (params?.branch && params.branch !== 'all') query.set('branch', params.branch);
    if (params?.month && params.month !== 'all') query.set('month', params.month);
    if (params?.search) query.set('search', params.search);

    const data = await this.request<{
      success: boolean;
      bookings: Booking[];
      summary: DailyLoggerSummary;
    }>(`/api/operations/bookings?${query.toString()}`);

    return { bookings: data.bookings, summary: data.summary };
  }

  public static async fetchFacilityRecords(filters?: {
    branch?: string;
    dateFilter?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FacilityRecordSummary[]> {
    const query = new URLSearchParams();
    if (filters?.branch && filters.branch !== 'all') query.set('branch', filters.branch);
    if (filters?.dateFilter) query.set('dateFilter', filters.dateFilter);
    if (filters?.startDate) query.set('startDate', filters.startDate);
    if (filters?.endDate) query.set('endDate', filters.endDate);

    const data = await this.request<{
      success: boolean;
      records: FacilityRecordSummary[];
    }>(`/api/operations/facilities?${query.toString()}`);

    return data.records;
  }

  public static async createBooking(
    bookingData: Omit<Booking, 'id' | 'createdAt'>
  ): Promise<Booking> {
    const data = await this.request<{ success: boolean; booking: Booking }>(
      '/api/operations/bookings',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      }
    );

    return data.booking;
  }

  public static async updateBooking(
    id: string,
    bookingData: Partial<Booking>
  ): Promise<Booking> {
    const data = await this.request<{ success: boolean; booking: Booking }>(
      `/api/operations/bookings/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      }
    );

    return data.booking;
  }

  public static async searchClients(query: string): Promise<ClientSuggestion[]> {
    if (!query) return [];
    const data = await this.request<{ success: boolean; clients: ClientSuggestion[] }>(
      `/api/operations/clients/search?q=${encodeURIComponent(query)}`
    );
    return data.clients;
  }

  public static async fetchNextBookingId(): Promise<string> {
    const data = await this.request<{ success: boolean; nextId: string }>(
      '/api/operations/next-id'
    );
    return data.nextId;
  }

  public static async fetchSystemSettings(): Promise<SystemSettings> {
    const data = await this.request<{ success: boolean; settings: SystemSettings }>(
      '/api/operations/settings'
    );
    return data.settings;
  }

  public static async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const data = await this.request<{ success: boolean; settings: SystemSettings }>(
      '/api/operations/settings',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }
    );
    return data.settings;
  }

  public static async fetchProfileSettings(userId?: string): Promise<ProfileSettings> {
    const url = userId ? `/api/operations/profile?userId=${encodeURIComponent(userId)}` : '/api/operations/profile';
    const data = await this.request<{ success: boolean; profile: ProfileSettings }>(url);
    return data.profile;
  }

  public static async updateProfileSettings(profile: ProfileSettings): Promise<ProfileSettings> {
    const data = await this.request<{ success: boolean; profile: ProfileSettings }>(
      '/api/operations/profile',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      }
    );
    return data.profile;
  }
}
