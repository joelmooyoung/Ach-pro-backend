import { BusinessDayService } from '../services/businessDayService';
import { FederalHoliday } from '../types';

describe('BusinessDayService', () => {
  let businessDayService: BusinessDayService;

  beforeEach(() => {
    const holidays: FederalHoliday[] = [
      {
        id: 'new-years-2024',
        name: "New Year's Day",
        date: new Date(2024, 0, 1), // January 1, 2024 (Monday)
        year: 2024,
        recurring: true
      },
      {
        id: 'independence-day-2024',
        name: "Independence Day",
        date: new Date(2024, 6, 4), // July 4, 2024 (Thursday)
        year: 2024,
        recurring: true
      }
    ];
    businessDayService = new BusinessDayService(holidays);
  });

  describe('getACHReleaseEffectiveDate', () => {
    it('should return next business day for a business day release date', () => {
      // Tuesday, January 2, 2024 (business day)
      const releaseDate = new Date(2024, 0, 2);
      const effectiveDate = businessDayService.getACHReleaseEffectiveDate(releaseDate);
      
      // Should return Wednesday, January 3, 2024
      expect(effectiveDate).toEqual(new Date(2024, 0, 3));
    });

    it('should handle weekend release dates correctly', () => {
      // Saturday, January 6, 2024
      const releaseDate = new Date(2024, 0, 6);
      const effectiveDate = businessDayService.getACHReleaseEffectiveDate(releaseDate);
      
      // Should move to Monday (Jan 8), then add 1 business day to get Tuesday (Jan 9)
      expect(effectiveDate).toEqual(new Date(2024, 0, 9));
    });

    it('should handle holiday release dates correctly', () => {
      // Monday, January 1, 2024 (New Year's Day - holiday)
      const releaseDate = new Date(2024, 0, 1);
      const effectiveDate = businessDayService.getACHReleaseEffectiveDate(releaseDate);
      
      // Should move to next business day (Tuesday, Jan 2), then add 1 business day (Wednesday, Jan 3)
      expect(effectiveDate).toEqual(new Date(2024, 0, 3));
    });

    it('should handle default parameter (current date)', () => {
      // Mock the current date to be a known business day
      const mockDate = new Date(2024, 0, 2); // Tuesday, January 2, 2024
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      const effectiveDate = businessDayService.getACHReleaseEffectiveDate();
      
      // Should return next business day (Wednesday, January 3, 2024)
      expect(effectiveDate).toEqual(new Date(2024, 0, 3));
      
      (global.Date as any).mockRestore();
    });

    it('should handle Friday release date correctly', () => {
      // Friday, January 5, 2024
      const releaseDate = new Date(2024, 0, 5);
      const effectiveDate = businessDayService.getACHReleaseEffectiveDate(releaseDate);
      
      // Should return Monday, January 8, 2024 (next business day)
      expect(effectiveDate).toEqual(new Date(2024, 0, 8));
    });

    it('should handle release date before a holiday', () => {
      // Wednesday, July 3, 2024 (day before Independence Day)
      const releaseDate = new Date(2024, 6, 3);
      const effectiveDate = businessDayService.getACHReleaseEffectiveDate(releaseDate);
      
      // Should return Friday, July 5, 2024 (since July 4 is a holiday)
      expect(effectiveDate).toEqual(new Date(2024, 6, 5));
    });
  });

  describe('isBusinessDay', () => {
    it('should return false for weekends', () => {
      // Saturday
      expect(businessDayService.isBusinessDay(new Date(2024, 0, 6))).toBe(false);
      
      // Sunday
      expect(businessDayService.isBusinessDay(new Date(2024, 0, 7))).toBe(false);
    });

    it('should return false for holidays', () => {
      // New Year's Day
      expect(businessDayService.isBusinessDay(new Date(2024, 0, 1))).toBe(false);
      
      // Independence Day
      expect(businessDayService.isBusinessDay(new Date(2024, 6, 4))).toBe(false);
    });

    it('should return true for regular business days', () => {
      // Tuesday, January 2, 2024
      expect(businessDayService.isBusinessDay(new Date(2024, 0, 2))).toBe(true);
      
      // Wednesday, January 3, 2024
      expect(businessDayService.isBusinessDay(new Date(2024, 0, 3))).toBe(true);
    });
  });

  describe('getCreditEffectiveDate', () => {
    it('should return date 2 business days after debit effective date', () => {
      // Tuesday, January 2, 2024
      const debitDate = new Date(2024, 0, 2);
      const creditDate = businessDayService.getCreditEffectiveDate(debitDate);
      
      // Should return Thursday, January 4, 2024 (2 business days later)
      expect(creditDate).toEqual(new Date(2024, 0, 4));
    });

    it('should skip weekends when calculating credit effective date', () => {
      // Friday, January 5, 2024
      const debitDate = new Date(2024, 0, 5);
      const creditDate = businessDayService.getCreditEffectiveDate(debitDate);
      
      // Should return Tuesday, January 9, 2024 (skipping weekend)
      expect(creditDate).toEqual(new Date(2024, 0, 9));
    });

    it('should skip holidays when calculating credit effective date', () => {
      // Tuesday, July 2, 2024 (2 business days would normally be Thursday July 4, but that's a holiday)
      const debitDate = new Date(2024, 6, 2);
      const creditDate = businessDayService.getCreditEffectiveDate(debitDate);
      
      // Should return Friday, July 5, 2024 (skipping Independence Day)
      expect(creditDate).toEqual(new Date(2024, 6, 5));
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete ACH processing schedule for a week', () => {
      const scenarios = [
        {
          releaseDate: new Date(2024, 0, 2), // Tuesday
          expectedDebitEffective: new Date(2024, 0, 3), // Wednesday
          expectedCreditEffective: new Date(2024, 0, 5) // Friday
        },
        {
          releaseDate: new Date(2024, 0, 3), // Wednesday
          expectedDebitEffective: new Date(2024, 0, 4), // Thursday
          expectedCreditEffective: new Date(2024, 0, 8) // Monday (skipping weekend)
        },
        {
          releaseDate: new Date(2024, 0, 4), // Thursday
          expectedDebitEffective: new Date(2024, 0, 5), // Friday
          expectedCreditEffective: new Date(2024, 0, 9) // Tuesday (skipping weekend)
        },
        {
          releaseDate: new Date(2024, 0, 5), // Friday
          expectedDebitEffective: new Date(2024, 0, 8), // Monday (next business day)
          expectedCreditEffective: new Date(2024, 0, 10) // Wednesday
        }
      ];

      scenarios.forEach(({ releaseDate, expectedDebitEffective, expectedCreditEffective }) => {
        const debitEffective = businessDayService.getACHReleaseEffectiveDate(releaseDate);
        const creditEffective = businessDayService.getCreditEffectiveDate(debitEffective);

        expect(debitEffective).toEqual(expectedDebitEffective);
        expect(creditEffective).toEqual(expectedCreditEffective);
      });
    });
  });
});