"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationRouter = void 0;
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.organizationRouter = router;
router.use(auth_1.authMiddleware);
const organizationSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(255).required(),
    description: joi_1.default.string().max(1000).optional(),
    active: joi_1.default.boolean().default(true)
});
router.post('/', auth_1.requireAdmin, async (req, res) => {
    try {
        const { error, value } = organizationSchema.validate(req.body);
        if (error) {
            const response = {
                success: false,
                error: error.details[0].message
            };
            return res.status(400).json(response);
        }
        const databaseService = req.app.locals.databaseService;
        const organization = {
            organizationKey: (0, uuid_1.v4)(),
            name: value.name,
            description: value.description,
            active: value.active
        };
        const createdOrganization = await databaseService.createOrganization(organization);
        const response = {
            success: true,
            data: createdOrganization,
            message: 'Organization created successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Create organization error:', error);
        const response = {
            success: false,
            error: 'Failed to create organization'
        };
        res.status(500).json(response);
    }
});
router.get('/', auth_1.requireAdmin, async (req, res) => {
    try {
        const querySchema = joi_1.default.object({
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).max(100).default(50)
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
        const result = await databaseService.getOrganizations(value.page, value.limit);
        res.json(result);
    }
    catch (error) {
        console.error('Get organizations error:', error);
        const response = {
            success: false,
            error: 'Failed to retrieve organizations'
        };
        res.status(500).json(response);
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const databaseService = req.app.locals.databaseService;
        const organization = await databaseService.getOrganization(id);
        if (!organization) {
            const response = {
                success: false,
                error: 'Organization not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: organization
        };
        res.json(response);
    }
    catch (error) {
        console.error('Get organization error:', error);
        const response = {
            success: false,
            error: 'Failed to retrieve organization'
        };
        res.status(500).json(response);
    }
});
router.get('/key/:organizationKey', async (req, res) => {
    try {
        const { organizationKey } = req.params;
        const databaseService = req.app.locals.databaseService;
        const organization = await databaseService.getOrganizationByKey(organizationKey);
        if (!organization) {
            const response = {
                success: false,
                error: 'Organization not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: organization
        };
        res.json(response);
    }
    catch (error) {
        console.error('Get organization by key error:', error);
        const response = {
            success: false,
            error: 'Failed to retrieve organization'
        };
        res.status(500).json(response);
    }
});
router.put('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateSchema = joi_1.default.object({
            name: joi_1.default.string().min(1).max(255).optional(),
            description: joi_1.default.string().max(1000).optional().allow(''),
            active: joi_1.default.boolean().optional()
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
        const organization = await databaseService.getOrganization(id);
        if (!organization) {
            const response = {
                success: false,
                error: 'Organization not found'
            };
            return res.status(404).json(response);
        }
        await databaseService.updateOrganization(id, value);
        const response = {
            success: true,
            message: 'Organization updated successfully'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Update organization error:', error);
        const response = {
            success: false,
            error: 'Failed to update organization'
        };
        res.status(500).json(response);
    }
});
//# sourceMappingURL=organizations.js.map