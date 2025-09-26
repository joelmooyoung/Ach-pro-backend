"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const businessDay_1 = require("../utils/businessDay");
describe('BusinessDayService', () => {
    beforeAll(async () => {
        // Load default holidays for testing
        await businessDay_1.BusinessDayService.loadFederalHolidays();
    });
    test('should identify weekends as non-business days', () => {
        // Saturday
        const saturday = new Date('2024-01-06');
        expect(businessDay_1.BusinessDayService.isBusinessDay(saturday)).toBe(false);
        // Sunday
        const sunday = new Date('2024-01-07');
        expect(businessDay_1.BusinessDayService.isBusinessDay(sunday)).toBe(false);
    });
    test('should identify weekdays as business days (excluding holidays)', () => {
        // Regular weekday
        const tuesday = new Date('2024-01-09');
        expect(businessDay_1.BusinessDayService.isBusinessDay(tuesday)).toBe(true);
    });
    test('should identify federal holidays as non-business days', () => {
        // New Year's Day (assuming it's a weekday)
        const newYears = new Date('2024-01-01');
        if (newYears.getDay() !== 0 && newYears.getDay() !== 6) {
            expect(businessDay_1.BusinessDayService.isBusinessDay(newYears)).toBe(false);
        }
    });
    test('should calculate next business day correctly', () => {
        // Friday -> next business day should be Monday (excluding holidays)
        const friday = new Date('2024-01-05');
        const nextBusinessDay = businessDay_1.BusinessDayService.getNextBusinessDay(friday);
        expect(nextBusinessDay.getDay()).not.toBe(0); // Not Sunday
        expect(nextBusinessDay.getDay()).not.toBe(6); // Not Saturday
        expect(nextBusinessDay > friday).toBe(true);
    });
    test('should calculate previous business day correctly', () => {
        // Monday -> previous business day should be Friday (excluding holidays)
        const monday = new Date('2024-01-08');
        const prevBusinessDay = businessDay_1.BusinessDayService.getPreviousBusinessDay(monday);
        expect(prevBusinessDay.getDay()).not.toBe(0); // Not Sunday
        expect(prevBusinessDay.getDay()).not.toBe(6); // Not Saturday
        expect(prevBusinessDay < monday).toBe(true);
    });
    test('should add business days correctly', () => {
        const startDate = new Date('2024-01-08'); // Monday
        const resultDate = businessDay_1.BusinessDayService.addBusinessDays(startDate, 5);
        // Adding 5 business days to Monday should give us next Monday
        expect(resultDate.getDay()).toBe(1); // Monday
        expect(resultDate > startDate).toBe(true);
    });
    test('should calculate business days between dates', () => {
        const startDate = new Date('2024-01-08'); // Monday
        const endDate = new Date('2024-01-12'); // Friday
        const businessDays = businessDay_1.BusinessDayService.businessDaysBetween(startDate, endDate);
        expect(businessDays).toBe(4); // Mon, Tue, Wed, Thu (not including end date)
    });
});
//# sourceMappingURL=businessDay.test.js.map