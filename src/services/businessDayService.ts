import moment from 'moment';
import 'moment-business-days';
import { BusinessDayCalculatorOptions, FederalHoliday } from '@/types';

export class BusinessDayService {
  private holidays: Date[] = [];

  constructor(holidays: FederalHoliday[] = []) {
    this.updateHolidays(holidays);
  }

  /**
   * Update the list of federal holidays
   */
  updateHolidays(holidays: FederalHoliday[]): void {
    this.holidays = holidays.map(holiday => new Date(holiday.date));
    
    // Configure moment-business-days with holidays
    const holidayDates = this.holidays.map(date => 
      moment(date).format('YYYY-MM-DD')
    );
    
    moment.updateLocale('us', {
      holidays: holidayDates,
      holidayFormat: 'YYYY-MM-DD'
    });
  }

  /**
   * Check if a date is a business day (not weekend and not a holiday)
   */
  isBusinessDay(date: Date): boolean {
    const momentDate = moment(date);
    
    // Check if it's a weekend
    if (momentDate.day() === 0 || momentDate.day() === 6) {
      return false;
    }
    
    // Check if it's a holiday
    return !this.isHoliday(date);
  }

  /**
   * Check if a date is a federal holiday
   */
  isHoliday(date: Date): boolean {
    const dateString = moment(date).format('YYYY-MM-DD');
    return this.holidays.some(holiday => 
      moment(holiday).format('YYYY-MM-DD') === dateString
    );
  }

  /**
   * Add business days to a date
   */
  addBusinessDays(date: Date, days: number): Date {
    const momentDate = moment(date);
    return momentDate.businessAdd(days).toDate();
  }

  /**
   * Subtract business days from a date
   */
  subtractBusinessDays(date: Date, days: number): Date {
    const momentDate = moment(date);
    return momentDate.businessSubtract(days).toDate();
  }

  /**
   * Get the next business day from a given date
   */
  getNextBusinessDay(date: Date): Date {
    if (this.isBusinessDay(date)) {
      return date;
    }
    return this.addBusinessDays(date, 1);
  }

  /**
   * Get the previous business day from a given date
   */
  getPreviousBusinessDay(date: Date): Date {
    return this.subtractBusinessDays(date, 1);
  }

  /**
   * Calculate business days between two dates (inclusive)
   */
  getBusinessDaysBetween(startDate: Date, endDate: Date): number {
    const start = moment(startDate);
    const end = moment(endDate);
    
    // Ensure start is before end
    const [earlier, later] = start.isBefore(end) ? [start, end] : [end, start];
    
    let count = 0;
    const current = earlier.clone();
    
    while (current.isSameOrBefore(later, 'day')) {
      if (this.isBusinessDay(current.toDate())) {
        count++;
      }
      current.add(1, 'day');
    }
    
    return count;
  }

  /**
   * Get the ACH effective date (next business day if current date is not a business day)
   */
  getACHEffectiveDate(date: Date = new Date()): Date {
    if (this.isBusinessDay(date)) {
      return date;
    }
    return this.getNextBusinessDay(date);
  }

  /**
   * Get the credit effective date (2 business days after debit effective date)
   */
  getCreditEffectiveDate(debitEffectiveDate: Date): Date {
    return this.addBusinessDays(debitEffectiveDate, 2);
  }

  /**
   * Get the ACH release date for NACHA file generation
   * ACH files should be released one business day prior to their effective date
   * Returns the effective date that should be processed for release today
   */
  getACHReleaseEffectiveDate(releaseDate: Date = new Date()): Date {
    // If release date is not a business day, move to next business day first
    const actualReleaseDate = this.isBusinessDay(releaseDate) ? releaseDate : this.getNextBusinessDay(releaseDate);
    
    // Return the next business day which is the effective date for transactions to be released today
    return this.addBusinessDays(actualReleaseDate, 1);
  }

  /**
   * Check if a date is valid for ACH effective date (must be business day)
   */
  isValidEffectiveDate(date: Date): boolean {
    return this.isBusinessDay(date);
  }

  /**
   * Get next valid effective date (next business day if given date is not valid)
   */
  getNextValidEffectiveDate(date: Date): Date {
    if (this.isValidEffectiveDate(date)) {
      return date;
    }
    return this.getNextBusinessDay(date);
  }

  /**
   * Get default federal holidays for a given year
   */
  static getDefaultFederalHolidays(year: number): FederalHoliday[] {
    const holidays: FederalHoliday[] = [
      {
        id: `new-years-${year}`,
        name: "New Year's Day",
        date: new Date(year, 0, 1),
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      },
      {
        id: `mlk-day-${year}`,
        name: "Martin Luther King Jr. Day",
        date: this.getNthWeekdayOfMonth(year, 0, 1, 3), // 3rd Monday in January
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      },
      {
        id: `presidents-day-${year}`,
        name: "Presidents Day",
        date: this.getNthWeekdayOfMonth(year, 1, 1, 3), // 3rd Monday in February
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      },
      {
        id: `memorial-day-${year}`,
        name: "Memorial Day",
        date: this.getLastWeekdayOfMonth(year, 4, 1), // Last Monday in May
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      },
      {
        id: `independence-day-${year}`,
        name: "Independence Day",
        date: new Date(year, 6, 4),
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      },
      {
        id: `labor-day-${year}`,
        name: "Labor Day",
        date: this.getNthWeekdayOfMonth(year, 8, 1, 1), // 1st Monday in September
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      },
      {
        id: `columbus-day-${year}`,
        name: "Columbus Day",
        date: this.getNthWeekdayOfMonth(year, 9, 1, 2), // 2nd Monday in October
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      },
      {
        id: `veterans-day-${year}`,
        name: "Veterans Day",
        date: new Date(year, 10, 11),
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      },
      {
        id: `thanksgiving-${year}`,
        name: "Thanksgiving Day",
        date: this.getNthWeekdayOfMonth(year, 10, 4, 4), // 4th Thursday in November
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      },
      {
        id: `christmas-${year}`,
        name: "Christmas Day",
        date: new Date(year, 11, 25),
        year,
        recurring: true,
        isRecurring: true,
        createdAt: new Date()
      }
    ];

    // Adjust holidays that fall on weekends
    return holidays.map(holiday => {
      const date = new Date(holiday.date);
      const dayOfWeek = date.getDay();
      
      // If holiday falls on Saturday, observe on Friday
      if (dayOfWeek === 6) {
        date.setDate(date.getDate() - 1);
      }
      // If holiday falls on Sunday, observe on Monday
      else if (dayOfWeek === 0) {
        date.setDate(date.getDate() + 1);
      }
      
      return {
        ...holiday,
        date
      };
    });
  }

  /**
   * Get the nth occurrence of a weekday in a month
   */
  private static getNthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number): Date {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysToAdd = (weekday - firstWeekday + 7) % 7;
    const date = new Date(year, month, 1 + daysToAdd + (occurrence - 1) * 7);
    return date;
  }

  /**
   * Get the last occurrence of a weekday in a month
   */
  private static getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
    const lastDay = new Date(year, month + 1, 0);
    const lastWeekday = lastDay.getDay();
    const daysToSubtract = (lastWeekday - weekday + 7) % 7;
    const date = new Date(year, month + 1, 0 - daysToSubtract);
    return date;
  }
}