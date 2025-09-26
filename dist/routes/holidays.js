"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.holidayRouter = void 0;
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const businessDayService_1 = require("../services/businessDayService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.holidayRouter = router;
router.use(auth_1.authMiddleware);
const holidaySchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    date: joi_1.default.date().required(),
    year: joi_1.default.number().integer().min(2020).max(2050).required(),
    recurring: joi_1.default.boolean().default(true)
});
router.get('/', auth_1.requireInternal, async (req, res) => {
    try {
        const querySchema = joi_1.default.object({
            year: joi_1.default.number().integer().min(2020).max(2050).optional()
        });
        const { error, value } = querySchema.validate(req.query);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const holidays = await databaseService.getFederalHolidays(value.year);
        const response = {
            success: true,
            data: holidays
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Get federal holidays error:', error);
        const response = {
            success: false,
            error: 'Failed to retrieve federal holidays'
        };
        return res.status(500).json(response);
    }
});
router.post('/', auth_1.requireInternal, async (req, res) => {
    try {
        const { error, value } = holidaySchema.validate(req.body);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const holiday = {
            name: value.name,
            date: new Date(value.date),
            year: value.year,
            recurring: value.recurring,
            isRecurring: value.recurring,
            createdAt: new Date()
        };
        const createdHoliday = await databaseService.createFederalHoliday(holiday);
        const businessDayService = req.app.locals.businessDayService;
        const allHolidays = await databaseService.getFederalHolidays();
        businessDayService.updateHolidays(allHolidays);
        const response = {
            success: true,
            data: createdHoliday,
            message: 'Federal holiday created successfully'
        };
        return res.status(201).json(response);
    }
    catch (error) {
        console.error('Create federal holiday error:', error);
        const response = {
            success: false,
            error: 'Failed to create federal holiday'
        };
        return res.status(500).json(response);
    }
});
router.put('/:id', auth_1.requireInternal, async (req, res) => {
    try {
        const { id } = req.params;
        const updateSchema = joi_1.default.object({
            name: joi_1.default.string().min(1).max(100).optional(),
            date: joi_1.default.date().optional(),
            year: joi_1.default.number().integer().min(2020).max(2050).optional(),
            recurring: joi_1.default.boolean().optional()
        });
        const { error, value } = updateSchema.validate(req.body);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const existingHolidays = await databaseService.getFederalHolidays();
        const holidayExists = existingHolidays.some(h => h.id === id);
        if (!holidayExists) {
            const response = {
                success: false,
                error: 'Federal holiday not found'
            };
            return res.status(404).json(response);
        }
        const updates = {};
        if (value.name !== undefined)
            updates.name = value.name;
        if (value.date !== undefined)
            updates.date = new Date(value.date);
        if (value.year !== undefined)
            updates.year = value.year;
        if (value.recurring !== undefined)
            updates.recurring = value.recurring;
        await databaseService.updateFederalHoliday(id, updates);
        const businessDayService = req.app.locals.businessDayService;
        const allHolidays = await databaseService.getFederalHolidays();
        businessDayService.updateHolidays(allHolidays);
        const response = {
            success: true,
            message: 'Federal holiday updated successfully'
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Update federal holiday error:', error);
        const response = {
            success: false,
            error: 'Failed to update federal holiday'
        };
        return res.status(500).json(response);
    }
});
router.delete('/:id', auth_1.requireInternal, async (req, res) => {
    try {
        const { id } = req.params;
        const databaseService = req.app.locals.databaseService;
        const existingHolidays = await databaseService.getFederalHolidays();
        const holidayExists = existingHolidays.some(h => h.id === id);
        if (!holidayExists) {
            const response = {
                success: false,
                error: 'Federal holiday not found'
            };
            return res.status(404).json(response);
        }
        await databaseService.deleteFederalHoliday(id);
        const businessDayService = req.app.locals.businessDayService;
        const allHolidays = await databaseService.getFederalHolidays();
        businessDayService.updateHolidays(allHolidays);
        const response = {
            success: true,
            message: 'Federal holiday deleted successfully'
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Delete federal holiday error:', error);
        const response = {
            success: false,
            error: 'Failed to delete federal holiday'
        };
        return res.status(500).json(response);
    }
});
router.post('/generate/:year', auth_1.requireInternal, async (req, res) => {
    try {
        const { year } = req.params;
        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2050) {
            const response = {
                success: false,
                error: 'Invalid year. Year must be between 2020 and 2050.'
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const existingHolidays = await databaseService.getFederalHolidays(yearNum);
        if (existingHolidays.length > 0) {
            const response = {
                success: false,
                error: `Federal holidays for year ${yearNum} already exist`
            };
            return res.status(400).json(response);
        }
        const defaultHolidays = businessDayService_1.BusinessDayService.getDefaultFederalHolidays(yearNum);
        const createdHolidays = [];
        for (const holiday of defaultHolidays) {
            const holidayData = {
                name: holiday.name,
                date: holiday.date,
                year: holiday.year,
                recurring: holiday.recurring,
                isRecurring: holiday.recurring,
                createdAt: holiday.createdAt
            };
            const created = await databaseService.createFederalHoliday(holidayData);
            createdHolidays.push(created);
        }
        const businessDayService = req.app.locals.businessDayService;
        const allHolidays = await databaseService.getFederalHolidays();
        businessDayService.updateHolidays(allHolidays);
        const response = {
            success: true,
            data: createdHolidays,
            message: `Generated ${createdHolidays.length} default federal holidays for ${yearNum}`
        };
        return res.status(201).json(response);
    }
    catch (error) {
        console.error('Generate federal holidays error:', error);
        const response = {
            success: false,
            error: 'Failed to generate federal holidays'
        };
        return res.status(500).json(response);
    }
});
router.get('/business-day/check/:date', auth_1.requireInternal, async (req, res) => {
    try {
        const { date } = req.params;
        const checkDate = new Date(date);
        if (isNaN(checkDate.getTime())) {
            const response = {
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD format.'
            };
            return res.status(400).json(response);
        }
        const businessDayService = req.app.locals.businessDayService;
        const isBusinessDay = businessDayService.isBusinessDay(checkDate);
        const isHoliday = businessDayService.isHoliday(checkDate);
        const isWeekend = checkDate.getDay() === 0 || checkDate.getDay() === 6;
        const response = {
            success: true,
            data: {
                date: checkDate.toISOString().split('T')[0],
                isBusinessDay,
                isHoliday,
                isWeekend,
                dayOfWeek: checkDate.toLocaleDateString('en-US', { weekday: 'long' })
            }
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Check business day error:', error);
        const response = {
            success: false,
            error: 'Failed to check business day'
        };
        return res.status(500).json(response);
    }
});
router.get('/business-day/calculate', auth_1.requireInternal, async (req, res) => {
    try {
        const querySchema = joi_1.default.object({
            startDate: joi_1.default.date().required(),
            endDate: joi_1.default.date().required()
        });
        const { error, value } = querySchema.validate(req.query);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const businessDayService = req.app.locals.businessDayService;
        const { startDate, endDate } = value;
        const businessDays = businessDayService.getBusinessDaysBetween(new Date(startDate), new Date(endDate));
        const response = {
            success: true,
            data: {
                startDate: new Date(startDate).toISOString().split('T')[0],
                endDate: new Date(endDate).toISOString().split('T')[0],
                businessDays
            }
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Calculate business days error:', error);
        const response = {
            success: false,
            error: 'Failed to calculate business days'
        };
        return res.status(500).json(response);
    }
});
router.get('/business-day/next/:date', auth_1.requireInternal, async (req, res) => {
    try {
        const { date } = req.params;
        const inputDate = new Date(date);
        if (isNaN(inputDate.getTime())) {
            const response = {
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD format.'
            };
            return res.status(400).json(response);
        }
        const businessDayService = req.app.locals.businessDayService;
        const nextBusinessDay = businessDayService.getNextBusinessDay(inputDate);
        const response = {
            success: true,
            data: {
                inputDate: inputDate.toISOString().split('T')[0],
                nextBusinessDay: nextBusinessDay.toISOString().split('T')[0]
            }
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Get next business day error:', error);
        const response = {
            success: false,
            error: 'Failed to get next business day'
        };
        return res.status(500).json(response);
    }
});
//# sourceMappingURL=holidays.js.map