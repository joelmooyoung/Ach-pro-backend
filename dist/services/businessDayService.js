"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessDayService = void 0;
const moment_1 = __importDefault(require("moment"));
require("moment-business-days");
class BusinessDayService {
    constructor(holidays = []) {
        this.holidays = [];
        this.updateHolidays(holidays);
    }
    updateHolidays(holidays) {
        this.holidays = holidays.map(holiday => new Date(holiday.date));
        const holidayDates = this.holidays.map(date => (0, moment_1.default)(date).format('YYYY-MM-DD'));
        moment_1.default.updateLocale('us', {
            holidays: holidayDates,
            holidayFormat: 'YYYY-MM-DD'
        });
    }
    isBusinessDay(date) {
        const momentDate = (0, moment_1.default)(date);
        if (momentDate.day() === 0 || momentDate.day() === 6) {
            return false;
        }
        return !this.isHoliday(date);
    }
    isHoliday(date) {
        const dateString = (0, moment_1.default)(date).format('YYYY-MM-DD');
        return this.holidays.some(holiday => (0, moment_1.default)(holiday).format('YYYY-MM-DD') === dateString);
    }
    addBusinessDays(date, days) {
        const momentDate = (0, moment_1.default)(date);
        return momentDate.businessAdd(days).toDate();
    }
    subtractBusinessDays(date, days) {
        const momentDate = (0, moment_1.default)(date);
        return momentDate.businessSubtract(days).toDate();
    }
    getNextBusinessDay(date) {
        if (this.isBusinessDay(date)) {
            return date;
        }
        return this.addBusinessDays(date, 1);
    }
    getPreviousBusinessDay(date) {
        return this.subtractBusinessDays(date, 1);
    }
    getBusinessDaysBetween(startDate, endDate) {
        const start = (0, moment_1.default)(startDate);
        const end = (0, moment_1.default)(endDate);
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
    getACHEffectiveDate(date = new Date()) {
        if (this.isBusinessDay(date)) {
            return date;
        }
        return this.getNextBusinessDay(date);
    }
    getCreditEffectiveDate(debitEffectiveDate) {
        return this.addBusinessDays(debitEffectiveDate, 2);
    }
    getACHReleaseEffectiveDate(releaseDate = new Date()) {
        const actualReleaseDate = this.isBusinessDay(releaseDate) ? releaseDate : this.getNextBusinessDay(releaseDate);
        return this.addBusinessDays(actualReleaseDate, 1);
    }
    isValidEffectiveDate(date) {
        return this.isBusinessDay(date);
    }
    getNextValidEffectiveDate(date) {
        if (this.isValidEffectiveDate(date)) {
            return date;
        }
        return this.getNextBusinessDay(date);
    }
    static getDefaultFederalHolidays(year) {
        const holidays = [
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
                date: this.getNthWeekdayOfMonth(year, 0, 1, 3),
                year,
                recurring: true,
                isRecurring: true,
                createdAt: new Date()
            },
            {
                id: `presidents-day-${year}`,
                name: "Presidents Day",
                date: this.getNthWeekdayOfMonth(year, 1, 1, 3),
                year,
                recurring: true,
                isRecurring: true,
                createdAt: new Date()
            },
            {
                id: `memorial-day-${year}`,
                name: "Memorial Day",
                date: this.getLastWeekdayOfMonth(year, 4, 1),
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
                date: this.getNthWeekdayOfMonth(year, 8, 1, 1),
                year,
                recurring: true,
                isRecurring: true,
                createdAt: new Date()
            },
            {
                id: `columbus-day-${year}`,
                name: "Columbus Day",
                date: this.getNthWeekdayOfMonth(year, 9, 1, 2),
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
                date: this.getNthWeekdayOfMonth(year, 10, 4, 4),
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
        return holidays.map(holiday => {
            const date = new Date(holiday.date);
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 6) {
                date.setDate(date.getDate() - 1);
            }
            else if (dayOfWeek === 0) {
                date.setDate(date.getDate() + 1);
            }
            return {
                ...holiday,
                date
            };
        });
    }
    static getNthWeekdayOfMonth(year, month, weekday, occurrence) {
        const firstDay = new Date(year, month, 1);
        const firstWeekday = firstDay.getDay();
        const daysToAdd = (weekday - firstWeekday + 7) % 7;
        const date = new Date(year, month, 1 + daysToAdd + (occurrence - 1) * 7);
        return date;
    }
    static getLastWeekdayOfMonth(year, month, weekday) {
        const lastDay = new Date(year, month + 1, 0);
        const lastWeekday = lastDay.getDay();
        const daysToSubtract = (lastWeekday - weekday + 7) % 7;
        const date = new Date(year, month + 1, 0 - daysToSubtract);
        return date;
    }
}
exports.BusinessDayService = BusinessDayService;
//# sourceMappingURL=businessDayService.js.map