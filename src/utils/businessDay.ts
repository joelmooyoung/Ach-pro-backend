import moment from 'moment';
import { supabase } from './supabase';

export class BusinessDayService {
  private static federalHolidays: Date[] = [];
  private static lastUpdated: Date | null = null;

  // Load federal holidays from database
  static async loadFederalHolidays(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('federal_holidays')
        .select('date')
        .eq('is_active', true);

      if (error) throw error;

      this.federalHolidays = data.map(holiday => new Date(holiday.date));
      this.lastUpdated = new Date();
    } catch (error) {
      console.error('Failed to load federal holidays:', error);
      // Fallback to basic federal holidays for current year
      this.loadDefaultHolidays();
    }
  }

  // Fallback method with common federal holidays
  private static loadDefaultHolidays(): void {
    const currentYear = new Date().getFullYear();
    this.federalHolidays = [
      new Date(currentYear, 0, 1),   // New Year's Day
      new Date(currentYear, 0, 15),  // MLK Day (3rd Monday in January)
      new Date(currentYear, 1, 19),  // Presidents Day (3rd Monday in February)
      new Date(currentYear, 4, 27),  // Memorial Day (last Monday in May)
      new Date(currentYear, 6, 4),   // Independence Day
      new Date(currentYear, 8, 2),   // Labor Day (1st Monday in September)
      new Date(currentYear, 9, 14),  // Columbus Day (2nd Monday in October)
      new Date(currentYear, 10, 11), // Veterans Day
      new Date(currentYear, 10, 28), // Thanksgiving (4th Thursday in November)
      new Date(currentYear, 11, 25), // Christmas Day
    ];
  }

  // Check if a date is a business day
  static isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    
    // Check if it's a weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Check if it's a federal holiday
    const dateString = moment(date).format('YYYY-MM-DD');
    return !this.federalHolidays.some(holiday => 
      moment(holiday).format('YYYY-MM-DD') === dateString
    );
  }

  // Get the next business day from a given date
  static getNextBusinessDay(date: Date): Date {
    let nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    while (!this.isBusinessDay(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  }

  // Get the previous business day from a given date
  static getPreviousBusinessDay(date: Date): Date {
    let prevDay = new Date(date);
    prevDay.setDate(prevDay.getDate() - 1);

    while (!this.isBusinessDay(prevDay)) {
      prevDay.setDate(prevDay.getDate() - 1);
    }

    return prevDay;
  }

  // Add business days to a date
  static addBusinessDays(date: Date, days: number): Date {
    let currentDate = new Date(date);
    let remainingDays = days;

    while (remainingDays > 0) {
      currentDate = this.getNextBusinessDay(currentDate);
      remainingDays--;
    }

    return currentDate;
  }

  // Calculate business days between two dates
  static businessDaysBetween(startDate: Date, endDate: Date): number {
    let count = 0;
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      if (this.isBusinessDay(currentDate)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  // Check if holidays need to be refreshed (daily)
  static async refreshHolidaysIfNeeded(): Promise<void> {
    if (!this.lastUpdated || 
        moment().diff(moment(this.lastUpdated), 'hours') > 24) {
      await this.loadFederalHolidays();
    }
  }
}