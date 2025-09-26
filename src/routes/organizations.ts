import express from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '@/services/databaseService';
import { Organization, ApiResponse } from '@/types';
import { authMiddleware, requireAdmin } from '@/middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation schema for organization
const organizationSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  active: Joi.boolean().default(true)
});

// Create a new organization (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { error, value } = organizationSchema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: error.details[0].message
      };
      return res.status(400).json(response);
    }

    const databaseService: DatabaseService = req.app.locals.databaseService;

    const organization: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'> = {
      organizationKey: uuidv4(),
      name: value.name,
      description: value.description,
      active: value.active
    };

    const createdOrganization = await databaseService.createOrganization(organization);

    const response: ApiResponse = {
      success: true,
      data: createdOrganization,
      message: 'Organization created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create organization error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create organization'
    };
    res.status(500).json(response);
  }
});

// Get all organizations with pagination (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(50)
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
    const result = await databaseService.getOrganizations(value.page, value.limit);

    res.json(result);
  } catch (error) {
    console.error('Get organizations error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve organizations'
    };
    res.status(500).json(response);
  }
});

// Get a specific organization by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const databaseService: DatabaseService = req.app.locals.databaseService;

    const organization = await databaseService.getOrganization(id);
    
    if (!organization) {
      const response: ApiResponse = {
        success: false,
        error: 'Organization not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: organization
    };

    res.json(response);
  } catch (error) {
    console.error('Get organization error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve organization'
    };
    res.status(500).json(response);
  }
});

// Get organization by key
router.get('/key/:organizationKey', async (req, res) => {
  try {
    const { organizationKey } = req.params;
    const databaseService: DatabaseService = req.app.locals.databaseService;

    const organization = await databaseService.getOrganizationByKey(organizationKey);
    
    if (!organization) {
      const response: ApiResponse = {
        success: false,
        error: 'Organization not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: organization
    };

    res.json(response);
  } catch (error) {
    console.error('Get organization by key error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve organization'
    };
    res.status(500).json(response);
  }
});

// Update organization (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateSchema = Joi.object({
      name: Joi.string().min(1).max(255).optional(),
      description: Joi.string().max(1000).optional().allow(''),
      active: Joi.boolean().optional()
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

    // Check if organization exists
    const organization = await databaseService.getOrganization(id);
    if (!organization) {
      const response: ApiResponse = {
        success: false,
        error: 'Organization not found'
      };
      return res.status(404).json(response);
    }

    await databaseService.updateOrganization(id, value);

    const response: ApiResponse = {
      success: true,
      message: 'Organization updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Update organization error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update organization'
    };
    res.status(500).json(response);
  }
});

export { router as organizationRouter };