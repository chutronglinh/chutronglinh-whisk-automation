import Project from '../models/Project.js';
import Account from '../models/Account.js';
import WhiskApiService from '../services/WhiskApiService.js';

class ProjectController {
  // Get all projects
  async getAll(req, res) {
    try {
      const { 
        accountId, 
        status = 'active', 
        page = 1, 
        limit = 50 
      } = req.query;

      const query = {};
      if (status) query.status = status;
      if (accountId) query.accountId = accountId;

      const projects = await Project.find(query)
        .populate('accountId', 'email status')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Project.countDocuments(query);

      res.json({
        success: true,
        data: projects,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get single project
  async getById(req, res) {
    try {
      const project = await Project.findById(req.params.id)
        .populate('accountId', 'email status');

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Create project for account
  async createForAccount(req, res) {
    try {
      const { accountId } = req.params;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Project name is required'
        });
      }

      // Get account
      const account = await Account.findById(accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      // Check if account has sessionCookie
      if (!account.sessionCookie) {
        return res.status(400).json({
          success: false,
          error: 'Account does not have session cookie. Please login first.'
        });
      }

      // Create project via Whisk API
      console.log(`[PROJECT] Creating project for ${account.email}...`);
      const workflowId = await WhiskApiService.createProject(
        account.sessionCookie,
        name
      );

      // Save to database
      const project = await Project.create({
        accountId: account._id,
        workflowId: workflowId,
        name: name,
        status: 'active'
      });

      console.log(`[PROJECT] Created: ${workflowId}`);

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
    } catch (error) {
      console.error(`[PROJECT] Error:`, error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete project
  async delete(req, res) {
    try {
      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { status: 'deleted' },
        { new: true }
      );

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get projects by account
  async getByAccount(req, res) {
    try {
      const { accountId } = req.params;

      const projects = await Project.find({
        accountId: accountId,
        status: 'active'
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get statistics
  async getStats(req, res) {
    try {
      const stats = {
        total: await Project.countDocuments(),
        active: await Project.countDocuments({ status: 'active' }),
        inactive: await Project.countDocuments({ status: 'inactive' }),
        deleted: await Project.countDocuments({ status: 'deleted' }),
        totalImages: await Project.aggregate([
          { $group: { _id: null, total: { $sum: '$imageCount' } } }
        ]).then(result => result[0]?.total || 0)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ProjectController();