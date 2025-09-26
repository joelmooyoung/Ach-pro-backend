import { BusinessDayService } from '../utils/businessDay';

describe('BusinessDayService', () => {
  beforeAll(async () => {
    // Load default holidays for testing
    await BusinessDayService.loadFederalHolidays();
  });

  test('should identify weekends as non-business days', () => {
    // Saturday
    const saturday = new Date('2024-01-06');
    expect(BusinessDayService.isBusinessDay(saturday)).toBe(false);

    // Sunday
    const sunday = new Date('2024-01-07');
    expect(BusinessDayService.isBusinessDay(sunday)).toBe(false);
  });

  test('should identify weekdays as business days (excluding holidays)', () => {
    // Regular weekday
    const tuesday = new Date('2024-01-09');
    expect(BusinessDayService.isBusinessDay(tuesday)).toBe(true);
  });

  test('should identify federal holidays as non-business days', () => {
    // New Year's Day (assuming it's a weekday)
    const newYears = new Date('2024-01-01');
    if (newYears.getDay() !== 0 && newYears.getDay() !== 6) {
      expect(BusinessDayService.isBusinessDay(newYears)).toBe(false);
    }
  });

  test('should calculate next business day correctly', () => {
    // Friday -> next business day should be Monday (excluding holidays)
    const friday = new Date('2024-01-05');
    const nextBusinessDay = BusinessDayService.getNextBusinessDay(friday);
    
    expect(nextBusinessDay.getDay()).not.toBe(0); // Not Sunday
    expect(nextBusinessDay.getDay()).not.toBe(6); // Not Saturday
    expect(nextBusinessDay > friday).toBe(true);
  });

  test('should calculate previous business day correctly', () => {
    // Monday -> previous business day should be Friday (excluding holidays)
    const monday = new Date('2024-01-08');
    const prevBusinessDay = BusinessDayService.getPreviousBusinessDay(monday);
    
    expect(prevBusinessDay.getDay()).not.toBe(0); // Not Sunday
    expect(prevBusinessDay.getDay()).not.toBe(6); // Not Saturday
    expect(prevBusinessDay < monday).toBe(true);
  });

  test('should add business days correctly', () => {
    const startDate = new Date('2024-01-08'); // Monday
    const resultDate = BusinessDayService.addBusinessDays(startDate, 5);
    
    // Adding 5 business days to Monday should give us next Monday
    expect(resultDate.getDay()).toBe(1); // Monday
    expect(resultDate > startDate).toBe(true);
  });

  test('should calculate business days between dates', () => {
    const startDate = new Date('2024-01-08'); // Monday
    const endDate = new Date('2024-01-12'); // Friday
    
    const businessDays = BusinessDayService.businessDaysBetween(startDate, endDate);
    expect(businessDays).toBe(4); // Mon, Tue, Wed, Thu (not including end date)
  });
});