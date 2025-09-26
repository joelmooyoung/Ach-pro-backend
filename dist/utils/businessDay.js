"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessDayService = void 0;
const moment_1 = __importDefault(require("moment"));
const supabase_1 = require("./supabase");
class BusinessDayService {
    static async loadFederalHolidays() {
        try {
            const { data, error } = await supabase_1.supabase
                .from('federal_holidays')
                .select('date')
                .eq('is_active', true);
            if (error)
                throw error;
            this.federalHolidays = data.map(holiday => new Date(holiday.date));
            this.lastUpdated = new Date();
        }
        catch (error) {
            console.error('Failed to load federal holidays:', error);
            this.loadDefaultHolidays();
        }
    }
    static loadDefaultHolidays() {
        const currentYear = new Date().getFullYear();
        this.federalHolidays = [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 0, 15),
            new Date(currentYear, 1, 19),
            new Date(currentYear, 4, 27),
            new Date(currentYear, 6, 4),
            new Date(currentYear, 8, 2),
            new Date(currentYear, 9, 14),
            new Date(currentYear, 10, 11),
            new Date(currentYear, 10, 28),
            new Date(currentYear, 11, 25),
        ];
    }
    static isBusinessDay(date) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }
        const dateString = (0, moment_1.default)(date).format('YYYY-MM-DD');
        return !this.federalHolidays.some(holiday => (0, moment_1.default)(holiday).format('YYYY-MM-DD') === dateString);
    }
    static getNextBusinessDay(date) {
        let nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        while (!this.isBusinessDay(nextDay)) {
            nextDay.setDate(nextDay.getDate() + 1);
        }
        return nextDay;
    }
    static getPreviousBusinessDay(date) {
        let prevDay = new Date(date);
        prevDay.setDate(prevDay.getDate() - 1);
        while (!this.isBusinessDay(prevDay)) {
            prevDay.setDate(prevDay.getDate() - 1);
        }
        return prevDay;
    }
    static addBusinessDays(date, days) {
        let currentDate = new Date(date);
        let remainingDays = days;
        while (remainingDays > 0) {
            currentDate = this.getNextBusinessDay(currentDate);
            remainingDays--;
        }
        return currentDate;
    }
    static businessDaysBetween(startDate, endDate) {
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
    static async refreshHolidaysIfNeeded() {
        if (!this.lastUpdated ||
            (0, moment_1.default)().diff((0, moment_1.default)(this.lastUpdated), 'hours') > 24) {
            await this.loadFederalHolidays();
        }
    }
}
exports.BusinessDayService = BusinessDayService;
BusinessDayService.federalHolidays = [];
BusinessDayService.lastUpdated = null;
//# sourceMappingURL=businessDay.js.map