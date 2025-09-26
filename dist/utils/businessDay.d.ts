export declare class BusinessDayService {
    private static federalHolidays;
    private static lastUpdated;
    static loadFederalHolidays(): Promise<void>;
    private static loadDefaultHolidays;
    static isBusinessDay(date: Date): boolean;
    static getNextBusinessDay(date: Date): Date;
    static getPreviousBusinessDay(date: Date): Date;
    static addBusinessDays(date: Date, days: number): Date;
    static businessDaysBetween(startDate: Date, endDate: Date): number;
    static refreshHolidaysIfNeeded(): Promise<void>;
}
//# sourceMappingURL=businessDay.d.ts.map