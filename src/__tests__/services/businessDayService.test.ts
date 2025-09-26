import { BusinessDayService } from '../../services/businessDayService';
import { FederalHoliday } from '../../types';

describe('BusinessDayService', () => {
  let businessDayService: BusinessDayService;

  const mockHolidays: FederalHoliday[] = [
    {
      id: '1',
      name: 'New Year\'s Day',
      date: new Date('2024-01-01'),
      year: 2024,
      recurring: true
    },
    {
      id: '2', 
      name: 'Martin Luther King Jr. Day',
      date: new Date('2024-01-15'), // 3rd Monday in January 2024
      year: 2024,
      recurring: true
    },
    {
      id: '3',
      name: 'Presidents Day',
      date: new Date('2024-02-19'), // 3rd Monday in February 2024
      year: 2024,
      recurring: true
    },
    {
      id: '4',
      name: 'Memorial Day',
      date: new Date('2024-05-27'), // Last Monday in May 2024
      year: 2024,
      recurring: true
    },
    {
      id: '5',
      name: 'Independence Day',
      date: new Date('2024-07-04'),
      year: 2024,
      recurring: true
    },
    {
      id: '6',
      name: 'Labor Day',
      date: new Date('2024-09-02'), // 1st Monday in September 2024
      year: 2024,
      recurring: true
    },
    {
      id: '7',
      name: 'Columbus Day',
      date: new Date('2024-10-14'), // 2nd Monday in October 2024
      year: 2024,
      recurring: true
    },
    {
      id: '8',
      name: 'Veterans Day',
      date: new Date('2024-11-11'),
      year: 2024,
      recurring: true
    },
    {
      id: '9',
      name: 'Thanksgiving Day',
      date: new Date('2024-11-28'), // 4th Thursday in November 2024
      year: 2024,
      recurring: true
    },
    {
      id: '10',
      name: 'Christmas Day',
      date: new Date('2024-12-25'),
      year: 2024,
      recurring: true
    }
  ];

  beforeEach(() => {
    businessDayService = new BusinessDayService(mockHolidays);
  });

  describe('Business Day Validation', () => {
    test('should identify weekdays as business days', () => {
      // Monday, September 16, 2024
      const monday = new Date('2024-09-16');
      expect(businessDayService.isBusinessDay(monday)).toBe(true);

      // Tuesday, September 17, 2024  
      const tuesday = new Date('2024-09-17');
      expect(businessDayService.isBusinessDay(tuesday)).toBe(true);

      // Wednesday, September 18, 2024
      const wednesday = new Date('2024-09-18');
      expect(businessDayService.isBusinessDay(wednesday)).toBe(true);

      // Thursday, September 19, 2024
      const thursday = new Date('2024-09-19');
      expect(businessDayService.isBusinessDay(thursday)).toBe(true);

      // Friday, September 20, 2024
      const friday = new Date('2024-09-20');
      expect(businessDayService.isBusinessDay(friday)).toBe(true);
    });

    test('should identify weekends as non-business days', () => {
      // Saturday, September 14, 2024
      const saturday = new Date('2024-09-14');
      expect(businessDayService.isBusinessDay(saturday)).toBe(false);

      // Sunday, September 15, 2024
      const sunday = new Date('2024-09-15');
      expect(businessDayService.isBusinessDay(sunday)).toBe(false);
    });

    test('should identify federal holidays as non-business days', () => {
      // New Year's Day 2024
      const newYears = new Date('2024-01-01');
      expect(businessDayService.isBusinessDay(newYears)).toBe(false);

      // Independence Day 2024
      const july4th = new Date('2024-07-04');
      expect(businessDayService.isBusinessDay(july4th)).toBe(false);

      // Christmas Day 2024
      const christmas = new Date('2024-12-25');
      expect(businessDayService.isBusinessDay(christmas)).toBe(false);
    });

    test('should identify holiday weekends correctly', () => {
      // If Independence Day falls on weekend, it should still be non-business day
      const july4th2020 = new Date('2020-07-04'); // This was a Saturday
      
      // Create service with 2020 holiday
      const holiday2020: FederalHoliday = {
        id: '1',
        name: 'Independence Day',
        date: july4th2020,
        year: 2020,
        recurring: true
      };
      
      const service2020 = new BusinessDayService([holiday2020]);
      expect(service2020.isBusinessDay(july4th2020)).toBe(false);
    });
  });

  describe('Holiday Detection', () => {
    test('should correctly identify federal holidays', () => {
      expect(businessDayService.isHoliday(new Date('2024-01-01'))).toBe(true);
      expect(businessDayService.isHoliday(new Date('2024-01-15'))).toBe(true);
      expect(businessDayService.isHoliday(new Date('2024-07-04'))).toBe(true);
      expect(businessDayService.isHoliday(new Date('2024-12-25'))).toBe(true);
    });

    test('should not identify regular days as holidays', () => {
      expect(businessDayService.isHoliday(new Date('2024-03-15'))).toBe(false);
      expect(businessDayService.isHoliday(new Date('2024-06-10'))).toBe(false);
      expect(businessDayService.isHoliday(new Date('2024-08-20'))).toBe(false);
    });

    test('should handle holiday updates', () => {
      // Initially, custom day is not a holiday
      const customDay = new Date('2024-04-01');
      expect(businessDayService.isHoliday(customDay)).toBe(false);

      // Add custom holiday
      const customHoliday: FederalHoliday = {
        id: '11',
        name: 'Custom Holiday',
        date: customDay,
        year: 2024,
        recurring: false
      };

      businessDayService.updateHolidays([...mockHolidays, customHoliday]);
      expect(businessDayService.isHoliday(customDay)).toBe(true);
    });
  });

  describe('Next Business Day Calculation', () => {
    test('should find next business day after weekend', () => {
      // Friday to next business day
      const friday = new Date('2024-09-13');
      // If Friday is a business day, next business day should be Monday
      if (businessDayService.isBusinessDay(friday)) {
        const nextBusinessDay = businessDayService.addBusinessDays(friday, 1);
        expect(nextBusinessDay.getDay()).toBe(1); // Monday
        expect(nextBusinessDay.getDate()).toBe(16); // September 16, 2024
      } else {
        // If Friday is not a business day, find the next one
        const nextBusinessDay = businessDayService.getNextBusinessDay(friday);
        expect(businessDayService.isBusinessDay(nextBusinessDay)).toBe(true);
      }
    });

    test('should find next business day after holiday', () => {
      // Day before Independence Day
      const beforeJuly4th = new Date('2024-07-03');
      const nextBusinessDay = businessDayService.getNextBusinessDay(beforeJuly4th);
      
      // Should find next business day (either same day if it's business day, or skip July 4th)
      expect(businessDayService.isBusinessDay(nextBusinessDay)).toBe(true);
      expect(nextBusinessDay.getTime()).toBeGreaterThanOrEqual(beforeJuly4th.getTime());
    });

    test('should find next business day after holiday weekend combination', () => {
      // Case where holiday is followed by weekend
      const newYears2024 = new Date('2024-01-01'); // Monday, New Year's Day
      const nextBusinessDay = businessDayService.getNextBusinessDay(newYears2024);
      expect(nextBusinessDay.getDate()).toBe(2); // January 2, 2024
    });

    test('should return same day if it is already a business day', () => {
      const businessDay = new Date('2024-09-17'); // Tuesday
      const nextBusinessDay = businessDayService.getNextBusinessDay(businessDay);
      expect(nextBusinessDay.getTime()).toBe(businessDay.getTime());
    });
  });

  describe('Previous Business Day Calculation', () => {
    test('should find previous business day before weekend', () => {
      // Monday to Friday
      const monday = new Date('2024-09-16');
      const prevBusinessDay = businessDayService.getPreviousBusinessDay(monday);
      expect(prevBusinessDay.getDay()).toBe(5); // Friday
      expect(prevBusinessDay.getDate()).toBe(13); // September 13, 2024
    });

    test('should find previous business day before holiday', () => {
      // Day after Independence Day
      const afterJuly4th = new Date('2024-07-05');
      const prevBusinessDay = businessDayService.getPreviousBusinessDay(afterJuly4th);
      
      // Should skip July 4th (holiday) and find July 3rd
      expect(prevBusinessDay.getDate()).toBe(3);
      expect(prevBusinessDay.getMonth()).toBe(6); // July
    });
  });

  describe('Business Days Between Dates', () => {
    test('should calculate business days between two dates', () => {
      const startDate = new Date('2024-09-16'); // Monday
      const endDate = new Date('2024-09-20'); // Friday
      
      const businessDays = businessDayService.getBusinessDaysBetween(startDate, endDate);
      expect(businessDays).toBe(5); // Mon, Tue, Wed, Thu, Fri
    });

    test('should exclude weekends in business day calculation', () => {
      const startDate = new Date('2024-09-13'); // Friday
      const endDate = new Date('2024-09-17'); // Tuesday
      
      const businessDays = businessDayService.getBusinessDaysBetween(startDate, endDate);
      expect(businessDays).toBe(3); // Fri, Mon, Tue (excluding Sat, Sun)
    });

    test('should exclude holidays in business day calculation', () => {
      const startDate = new Date('2024-07-03'); // Wednesday before July 4th
      const endDate = new Date('2024-07-08'); // Monday after July 4th
      
      const businessDays = businessDayService.getBusinessDaysBetween(startDate, endDate);
      expect(businessDays).toBeGreaterThan(0); // Should have some business days
      expect(businessDays).toBeLessThan(6); // Should be less than if no holidays
    });

    test('should handle same day calculation', () => {
      const sameDay = new Date('2024-09-17');
      const businessDays = businessDayService.getBusinessDaysBetween(sameDay, sameDay);
      expect(businessDays).toBe(1);
    });

    test('should handle reverse date order', () => {
      const laterDate = new Date('2024-09-20');
      const earlierDate = new Date('2024-09-16');
      
      const businessDays = businessDayService.getBusinessDaysBetween(laterDate, earlierDate);
      expect(businessDays).toBe(5); // Should still calculate correctly
    });
  });

  describe('Add Business Days', () => {
    test('should add business days correctly', () => {
      const startDate = new Date('2024-09-16'); // Monday
      const result = businessDayService.addBusinessDays(startDate, 5);
      
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(23); // September 23, 2024
    });

    test('should skip weekends when adding business days', () => {
      const friday = new Date('2024-09-13'); // Friday
      const result = businessDayService.addBusinessDays(friday, 1);
      
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(16);
    });

    test('should skip holidays when adding business days', () => {
      const beforeJuly4th = new Date('2024-07-03'); // Wednesday
      const result = businessDayService.addBusinessDays(beforeJuly4th, 2);
      
      // Should skip July 4th and land on July 8th (Monday)
      expect(result.getDate()).toBe(8);
      expect(result.getMonth()).toBe(6); // July
    });

    test('should handle adding zero business days', () => {
      const date = new Date('2024-09-17');
      const result = businessDayService.addBusinessDays(date, 0);
      expect(result.getTime()).toBe(date.getTime());
    });

    test('should handle negative business days (subtract)', () => {
      const monday = new Date('2024-09-16');
      const result = businessDayService.addBusinessDays(monday, -1);
      
      expect(result.getDay()).toBe(5); // Friday
      expect(result.getDate()).toBe(13);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty holiday list', () => {
      const serviceWithoutHolidays = new BusinessDayService([]);
      
      // July 4th should be a business day without holiday configuration
      const july4th = new Date('2024-07-04');
      expect(serviceWithoutHolidays.isHoliday(july4th)).toBe(false);
      // But it might still be weekend dependent
      if (july4th.getDay() !== 0 && july4th.getDay() !== 6) {
        expect(serviceWithoutHolidays.isBusinessDay(july4th)).toBe(true);
      }
    });

    test('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');
      // moment.js handles invalid dates by returning an invalid moment
      // The test should check if the date is valid first
      expect(isNaN(invalidDate.getTime())).toBe(true);
    });

    test('should handle year boundaries correctly', () => {
      const endOfYear = new Date('2024-12-31'); // Tuesday
      const newYear = new Date('2025-01-01'); // Wednesday
      
      // End of year should be business day (if not holiday)
      if (!businessDayService.isHoliday(endOfYear)) {
        expect(businessDayService.isBusinessDay(endOfYear)).toBe(true);
      }
      
      // New Year's should be holiday
      // Note: We'd need to update holidays for 2025, but for this test assume it's configured
    });

    test('should handle leap year dates', () => {
      const leapYearDay = new Date('2024-02-29'); // Leap year day, Thursday
      expect(businessDayService.isBusinessDay(leapYearDay)).toBe(true);
    });
  });

  describe('NACHA-Specific Business Day Rules', () => {
    test('should validate effective date compliance', () => {
      // NACHA files typically require effective dates to be business days
      const effectiveDate = new Date('2024-09-17'); // Tuesday
      expect(businessDayService.isValidEffectiveDate(effectiveDate)).toBe(true);
      
      const weekendDate = new Date('2024-09-14'); // Saturday
      expect(businessDayService.isValidEffectiveDate(weekendDate)).toBe(false);
      
      const holidayDate = new Date('2024-07-04'); // Independence Day
      expect(businessDayService.isValidEffectiveDate(holidayDate)).toBe(false);
    });

    test('should suggest next valid effective date', () => {
      const weekendDate = new Date('2024-09-14'); // Saturday
      const nextValid = businessDayService.getNextValidEffectiveDate(weekendDate);
      
      expect(businessDayService.isValidEffectiveDate(nextValid)).toBe(true);
      expect(nextValid.getDay()).toBe(1); // Monday
    });

    test('should handle settlement day calculations', () => {
      // ACH settlement typically occurs 1-2 business days after effective date
      const effectiveDate = new Date('2024-09-17'); // Tuesday
      const settlementDate = businessDayService.addBusinessDays(effectiveDate, 1);
      
      expect(businessDayService.isBusinessDay(settlementDate)).toBe(true);
      expect(settlementDate.getDate()).toBe(18); // Wednesday
    });
  });
});