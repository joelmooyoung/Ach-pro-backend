import express from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '@/services/databaseService';
import { BusinessDayService } from '@/services/businessDayService';
import { FederalHoliday, ApiResponse } from '@/types';
import { authMiddleware, requireAdmin, requireOperator, requireInternal } from '@/middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation schema for federal holiday
const holidaySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  date: Joi.date().required(),
  year: Joi.number().integer().min(2020).max(2050).required(),
  recurring: Joi.boolean().default(true)
});

// Get all federal holidays - Internal access only
router.get('/', requireInternal, async (req, res) => {
  try {
    const querySchema = Joi.object({
      year: Joi.number().integer().min(2020).max(2050).optional()
    });

    const { error, value } = querySchema.validate(req.query);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const databaseService: DatabaseService = req.app.locals.databaseService;
    const holidays = await databaseService.getFederalHolidays(value.year);

    const response: ApiResponse = {
      success: true,
      data: holidays
    };

    return res.json(response);
  } catch (error) {
    console.error('Get federal holidays error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve federal holidays'
    };
    return res.status(500).json(response);
  }
});

// Create a new federal holiday
router.post('/', requireInternal, async (req, res) => {
  try {
    const { error, value } = holidaySchema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const databaseService: DatabaseService = req.app.locals.databaseService;

    const holiday: Omit<FederalHoliday, 'id'> = {
      name: value.name,
      date: new Date(value.date),
      year: value.year,
      recurring: value.recurring,
      isRecurring: value.recurring,
      createdAt: new Date()
    };

    const createdHoliday = await databaseService.createFederalHoliday(holiday);

    // Update business day service with new holidays
    const businessDayService: BusinessDayService = req.app.locals.businessDayService;
    const allHolidays = await databaseService.getFederalHolidays();
    businessDayService.updateHolidays(allHolidays);

    const response: ApiResponse = {
      success: true,
      data: createdHoliday,
      message: 'Federal holiday created successfully'
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Create federal holiday error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create federal holiday'
    };
    return res.status(500).json(response);
  }
});

// Update a federal holiday
router.put('/:id', requireInternal, async (req, res) => {
  try {
    const { id } = req.params;
    const updateSchema = Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      date: Joi.date().optional(),
      year: Joi.number().integer().min(2020).max(2050).optional(),
      recurring: Joi.boolean().optional()
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const databaseService: DatabaseService = req.app.locals.databaseService;

    // Check if holiday exists
    const existingHolidays = await databaseService.getFederalHolidays();
    const holidayExists = existingHolidays.some(h => h.id === id);
    
    if (!holidayExists) {
      const response: ApiResponse = {
        success: false,
        error: 'Federal holiday not found'
      };
      return res.status(404).json(response);
    }

    const updates: Partial<FederalHoliday> = {};
    if (value.name !== undefined) updates.name = value.name;
    if (value.date !== undefined) updates.date = new Date(value.date);
    if (value.year !== undefined) updates.year = value.year;
    if (value.recurring !== undefined) updates.recurring = value.recurring;

    await databaseService.updateFederalHoliday(id, updates);

    // Update business day service with updated holidays
    const businessDayService: BusinessDayService = req.app.locals.businessDayService;
    const allHolidays = await databaseService.getFederalHolidays();
    businessDayService.updateHolidays(allHolidays);

    const response: ApiResponse = {
      success: true,
      message: 'Federal holiday updated successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Update federal holiday error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update federal holiday'
    };
    return res.status(500).json(response);
  }
});

// Delete a federal holiday
router.delete('/:id', requireInternal, async (req, res) => {
  try {
    const { id } = req.params;

    const databaseService: DatabaseService = req.app.locals.databaseService;

    // Check if holiday exists
    const existingHolidays = await databaseService.getFederalHolidays();
    const holidayExists = existingHolidays.some(h => h.id === id);
    
    if (!holidayExists) {
      const response: ApiResponse = {
        success: false,
        error: 'Federal holiday not found'
      };
      return res.status(404).json(response);
    }

    await databaseService.deleteFederalHoliday(id);

    // Update business day service with remaining holidays
    const businessDayService: BusinessDayService = req.app.locals.businessDayService;
    const allHolidays = await databaseService.getFederalHolidays();
    businessDayService.updateHolidays(allHolidays);

    const response: ApiResponse = {
      success: true,
      message: 'Federal holiday deleted successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Delete federal holiday error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete federal holiday'
    };
    return res.status(500).json(response);
  }
});

// Generate default federal holidays for a year
router.post('/generate/:year', requireInternal, async (req, res) => {
  try {
    const { year } = req.params;
    const yearNum = parseInt(year);

    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2050) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid year. Year must be between 2020 and 2050.'
      };
      return res.status(400).json(response);
    }

    const databaseService: DatabaseService = req.app.locals.databaseService;

    // Check if holidays already exist for this year
    const existingHolidays = await databaseService.getFederalHolidays(yearNum);
    if (existingHolidays.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: `Federal holidays for year ${yearNum} already exist`
      };
      return res.status(400).json(response);
    }

    // Generate default federal holidays
    const defaultHolidays = BusinessDayService.getDefaultFederalHolidays(yearNum);

    // Create holidays in database
    const createdHolidays = [];
    for (const holiday of defaultHolidays) {
      const holidayData: Omit<FederalHoliday, 'id'> = {
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

    // Update business day service with new holidays
    const businessDayService: BusinessDayService = req.app.locals.businessDayService;
    const allHolidays = await databaseService.getFederalHolidays();
    businessDayService.updateHolidays(allHolidays);

    const response: ApiResponse = {
      success: true,
      data: createdHolidays,
      message: `Generated ${createdHolidays.length} default federal holidays for ${yearNum}`
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Generate federal holidays error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate federal holidays'
    };
    return res.status(500).json(response);
  }
});

// Check if a date is a business day - Internal access only
router.get('/business-day/check/:date', requireInternal, async (req, res) => {
  try {
    const { date } = req.params;
    const checkDate = new Date(date);

    if (isNaN(checkDate.getTime())) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD format.'
      };
      return res.status(400).json(response);
    }

    const businessDayService: BusinessDayService = req.app.locals.businessDayService;

    const isBusinessDay = businessDayService.isBusinessDay(checkDate);
    const isHoliday = businessDayService.isHoliday(checkDate);
    const isWeekend = checkDate.getDay() === 0 || checkDate.getDay() === 6;

    const response: ApiResponse = {
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
  } catch (error) {
    console.error('Check business day error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to check business day'
    };
    return res.status(500).json(response);
  }
});

// Calculate business days between two dates - Internal access only
router.get('/business-day/calculate', requireInternal, async (req, res) => {
  try {
    const querySchema = Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().required()
    });

    const { error, value } = querySchema.validate(req.query);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const businessDayService: BusinessDayService = req.app.locals.businessDayService;
    const { startDate, endDate } = value;

    const businessDays = businessDayService.getBusinessDaysBetween(
      new Date(startDate),
      new Date(endDate)
    );

    const response: ApiResponse = {
      success: true,
      data: {
        startDate: new Date(startDate).toISOString().split('T')[0],
        endDate: new Date(endDate).toISOString().split('T')[0],
        businessDays
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Calculate business days error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to calculate business days'
    };
    return res.status(500).json(response);
  }
});

// Get next business day from a date - Internal access only
router.get('/business-day/next/:date', requireInternal, async (req, res) => {
  try {
    const { date } = req.params;
    const inputDate = new Date(date);

    if (isNaN(inputDate.getTime())) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD format.'
      };
      return res.status(400).json(response);
    }

    const businessDayService: BusinessDayService = req.app.locals.businessDayService;
    const nextBusinessDay = businessDayService.getNextBusinessDay(inputDate);

    const response: ApiResponse = {
      success: true,
      data: {
        inputDate: inputDate.toISOString().split('T')[0],
        nextBusinessDay: nextBusinessDay.toISOString().split('T')[0]
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Get next business day error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get next business day'
    };
    return res.status(500).json(response);
  }
});

export { router as holidayRouter };