import GeneratedImage from '../models/GeneratedImage.js';
import Prompt from '../models/Prompt.js';
import Project from '../models/Project.js';
import Account from '../models/Account.js';
import { imageGenerationQueue } from '../services/QueueService.js';

class GenerateController {
  /**
   * Start image generation job
   * POST /api/generate/start
   * Body: {
   *   selections: [{
   *     accountId: string,
   *     projectId: string,
   *     promptIds: [string]
   *   }]
   * }
   */
  async startGeneration(req, res) {
    try {
      const { selections } = req.body;

      if (!selections || !Array.isArray(selections) || selections.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid selections format'
        });
      }

      // Validate selections
      const validationErrors = [];
      const jobIds = [];

      for (let i = 0; i < selections.length; i++) {
        const selection = selections[i];
        const { accountId, projectId, promptIds } = selection;

        // Validate required fields
        if (!accountId || !projectId || !promptIds || !Array.isArray(promptIds)) {
          validationErrors.push(`Selection ${i + 1}: Missing required fields`);
          continue;
        }

        if (promptIds.length === 0) {
          validationErrors.push(`Selection ${i + 1}: No prompts selected`);
          continue;
        }

        // Validate account
        const account = await Account.findById(accountId);
        if (!account) {
          validationErrors.push(`Selection ${i + 1}: Account not found`);
          continue;
        }

        if (!account.sessionCookie) {
          validationErrors.push(`Selection ${i + 1}: Account has no session cookie`);
          continue;
        }

        // Validate project
        const project = await Project.findById(projectId);
        if (!project) {
          validationErrors.push(`Selection ${i + 1}: Project not found`);
          continue;
        }

        if (project.accountId.toString() !== accountId) {
          validationErrors.push(`Selection ${i + 1}: Project does not belong to account`);
          continue;
        }

        // Validate prompts
        const prompts = await Prompt.find({
          _id: { $in: promptIds },
          status: 'active'
        });

        if (prompts.length !== promptIds.length) {
          validationErrors.push(`Selection ${i + 1}: Some prompts not found or inactive`);
          continue;
        }

        // Create jobs for each prompt
        for (const prompt of prompts) {
          const job = await imageGenerationQueue.add({
            accountId: accountId,
            projectId: projectId,
            promptId: prompt._id.toString(),
            prompt: prompt.text,
            metadata: prompt.metadata
          });

          jobIds.push(job.id);
        }
      }

      if (validationErrors.length > 0 && jobIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validationErrors
        });
      }

      res.json({
        success: true,
        data: {
          jobIds: jobIds,
          totalJobs: jobIds.length,
          errors: validationErrors.length > 0 ? validationErrors : undefined
        },
        message: `Started ${jobIds.length} generation job(s)`
      });
    } catch (error) {
      console.error('[GENERATE] Error starting generation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get job status
   * GET /api/generate/status/:jobId
   */
  async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const job = await imageGenerationQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const state = await job.getState();
      const progress = job.progress();
      const returnValue = job.returnvalue;
      const failedReason = job.failedReason;

      res.json({
        success: true,
        data: {
          jobId: job.id,
          state: state,
          progress: progress,
          result: returnValue,
          error: failedReason,
          data: job.data
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all generated images with filters
   * GET /api/generated-images
   */
  async getAllImages(req, res) {
    try {
      const {
        accountId,
        projectId,
        promptId,
        status,
        page = 1,
        limit = 50,
        sortBy = 'generatedAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      if (accountId) query.accountId = accountId;
      if (projectId) query.projectId = projectId;
      if (promptId) query.promptId = promptId;
      if (status) query.status = status;

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const images = await GeneratedImage.find(query)
        .populate('accountId', 'email')
        .populate('projectId', 'name workflowId')
        .populate('promptId', 'text category')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await GeneratedImage.countDocuments(query);

      res.json({
        success: true,
        data: images,
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

  /**
   * Get single generated image
   * GET /api/generated-images/:id
   */
  async getImageById(req, res) {
    try {
      const image = await GeneratedImage.findById(req.params.id)
        .populate('accountId', 'email')
        .populate('projectId', 'name workflowId')
        .populate('promptId', 'text category metadata');

      if (!image) {
        return res.status(404).json({
          success: false,
          error: 'Image not found'
        });
      }

      res.json({
        success: true,
        data: image
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete generated image
   * DELETE /api/generated-images/:id
   */
  async deleteImage(req, res) {
    try {
      const image = await GeneratedImage.findByIdAndDelete(req.params.id);

      if (!image) {
        return res.status(404).json({
          success: false,
          error: 'Image not found'
        });
      }

      // TODO: Delete physical file from disk
      // fs.unlinkSync(path.join(process.env.OUTPUT_PATH, image.filename));

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get generation statistics
   * GET /api/generate/stats
   */
  async getStats(req, res) {
    try {
      const stats = {
        total: await GeneratedImage.countDocuments(),
        success: await GeneratedImage.countDocuments({ status: 'success' }),
        failed: await GeneratedImage.countDocuments({ status: 'failed' }),
        pending: await GeneratedImage.countDocuments({ status: 'pending' }),
        byAccount: {},
        byProject: {},
        recent: []
      };

      // Stats by account
      const accountStats = await GeneratedImage.aggregate([
        {
          $group: {
            _id: '$accountId',
            count: { $sum: 1 },
            success: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'accounts',
            localField: '_id',
            foreignField: '_id',
            as: 'account'
          }
        }
      ]);

      accountStats.forEach(stat => {
        const email = stat.account[0]?.email || 'Unknown';
        stats.byAccount[email] = {
          total: stat.count,
          success: stat.success
        };
      });

      // Recent generations
      stats.recent = await GeneratedImage.find()
        .populate('accountId', 'email')
        .populate('promptId', 'text')
        .sort({ generatedAt: -1 })
        .limit(10)
        .select('prompt status generatedAt accountId promptId')
        .lean();

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

  /**
   * Get queue status
   * GET /api/generate/queue-status
   */
  async getQueueStatus(req, res) {
    try {
      const waiting = await imageGenerationQueue.getWaitingCount();
      const active = await imageGenerationQueue.getActiveCount();
      const completed = await imageGenerationQueue.getCompletedCount();
      const failed = await imageGenerationQueue.getFailedCount();

      res.json({
        success: true,
        data: {
          waiting,
          active,
          completed,
          failed,
          total: waiting + active + completed + failed
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default GenerateController;