import 'moment-business-days';
import { FederalHoliday } from '../types';
export declare class BusinessDayService {
    private holidays;
    constructor(holidays?: FederalHoliday[]);
    updateHolidays(holidays: FederalHoliday[]): void;
    isBusinessDay(date: Date): boolean;
    isHoliday(date: Date): boolean;
    addBusinessDays(date: Date, days: number): Date;
    subtractBusinessDays(date: Date, days: number): Date;
    getNextBusinessDay(date: Date): Date;
    getPreviousBusinessDay(date: Date): Date;
    getBusinessDaysBetween(startDate: Date, endDate: Date): number;
    getACHEffectiveDate(date?: Date): Date;
    getCreditEffectiveDate(debitEffectiveDate: Date): Date;
    getACHReleaseEffectiveDate(releaseDate?: Date): Date;
    isValidEffectiveDate(date: Date): boolean;
    getNextValidEffectiveDate(date: Date): Date;
    static getDefaultFederalHolidays(year: number): FederalHoliday[];
    private static getNthWeekdayOfMonth;
    private static getLastWeekdayOfMonth;
}
//# sourceMappingURL=businessDayService.d.ts.map