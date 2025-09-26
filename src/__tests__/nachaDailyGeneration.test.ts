import { BusinessDayService } from '../services/businessDayService';
import { FederalHoliday, TransactionStatus } from '../types';

describe('NACHA Daily Generation Logic Tests', () => {
  let businessDayService: BusinessDayService;

  beforeAll(() => {
    // Setup holidays for testing
    const holidays: FederalHoliday[] = [
      {
        id: 'new-years-2024',
        name: "New Year's Day",
        date: new Date(2024, 0, 1), // January 1, 2024
        year: 2024,
        recurring: true
      }
    ];

    businessDayService = new BusinessDayService(holidays);
  });

  describe('Daily ACH Processing Logic', () => {
    it('should calculate correct effective dates for daily NACHA generation', () => {
      const testCases = [
        {
          name: 'Tuesday release for debit files',
          releaseDate: new Date(2024, 0, 2), // Tuesday, Jan 2
          fileType: 'DR',
          expectedEffectiveDate: new Date(2024, 0, 3), // Wednesday, Jan 3
          description: 'Debit files released Tuesday should be effective Wednesday'
        },
        {
          name: 'Tuesday release for credit files', 
          releaseDate: new Date(2024, 0, 2), // Tuesday, Jan 2
          fileType: 'CR',
          expectedEffectiveDate: new Date(2024, 0, 5), // Friday, Jan 5 (2 business days after Wed)
          description: 'Credit files should be 2 business days after debit effective date'
        },
        {
          name: 'Friday release for debit files',
          releaseDate: new Date(2024, 0, 5), // Friday, Jan 5
          fileType: 'DR', 
          expectedEffectiveDate: new Date(2024, 0, 8), // Monday, Jan 8 (next business day)
          description: 'Friday release should be effective next Monday'
        },
        {
          name: 'Weekend release handling',
          releaseDate: new Date(2024, 0, 6), // Saturday, Jan 6
          fileType: 'DR',
          expectedEffectiveDate: new Date(2024, 0, 9), // Tuesday, Jan 9 (Monday + 1 business day)
          description: 'Weekend releases should move to next business day then add 1'
        },
        {
          name: 'Holiday release handling',
          releaseDate: new Date(2024, 0, 1), // Monday, Jan 1 (New Year's)
          fileType: 'DR',
          expectedEffectiveDate: new Date(2024, 0, 3), // Wednesday, Jan 3 (Tue + 1 business day)
          description: 'Holiday releases should move to next business day then add 1'
        }
      ];

      testCases.forEach(({ name, releaseDate, fileType, expectedEffectiveDate, description }) => {
        // Calculate target effective date using the business day service
        let targetEffectiveDate = businessDayService.getACHReleaseEffectiveDate(releaseDate);
        
        if (fileType === 'CR') {
          targetEffectiveDate = businessDayService.getCreditEffectiveDate(targetEffectiveDate);
        }

        expect(targetEffectiveDate).toEqual(expectedEffectiveDate);
        console.log(`✓ ${name}: ${description}`);
        console.log(`  Release: ${releaseDate.toDateString()}`);
        console.log(`  Effective: ${targetEffectiveDate.toDateString()}`);
        console.log(`  Expected: ${expectedEffectiveDate.toDateString()}\n`);
      });
    });

    it('should handle month-end scenarios correctly', () => {
      // Test scenarios around month boundaries
      const monthEndCases = [
        {
          releaseDate: new Date(2024, 0, 31), // Wednesday, Jan 31
          expectedEffectiveDate: new Date(2024, 1, 1), // Thursday, Feb 1
          description: 'Month boundary should work correctly'
        },
        {
          releaseDate: new Date(2024, 1, 29), // Thursday, Feb 29 (leap year)
          expectedEffectiveDate: new Date(2024, 2, 1), // Friday, Mar 1
          description: 'Leap year boundary should work correctly'
        }
      ];

      monthEndCases.forEach(({ releaseDate, expectedEffectiveDate, description }) => {
        const targetEffectiveDate = businessDayService.getACHReleaseEffectiveDate(releaseDate);
        expect(targetEffectiveDate).toEqual(expectedEffectiveDate);
        console.log(`✓ ${description}`);
      });
    });

    it('should validate ACH processing timeline requirements', () => {
      // Verify that ACH files are indeed released 1 business day prior to effective date
      const releaseDate = new Date(2024, 0, 2); // Tuesday
      const effectiveDate = businessDayService.getACHReleaseEffectiveDate(releaseDate);
      
      // Calculate business days between release and effective
      const businessDaysBetween = businessDayService.getBusinessDaysBetween(releaseDate, effectiveDate);
      
      // Should be exactly 1 business day between release and effective
      expect(businessDaysBetween).toBe(-1); // Negative because we're going forward in time
      
      // Verify the effective date is indeed a business day
      expect(businessDayService.isBusinessDay(effectiveDate)).toBe(true);
      
      // Verify the release date calculation is consistent
      const backCalculatedReleaseDate = businessDayService.getPreviousBusinessDay(effectiveDate);
      expect(backCalculatedReleaseDate).toEqual(releaseDate);
    });
  });
});