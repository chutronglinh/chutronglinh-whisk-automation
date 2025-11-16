import Job from '../models/Job.js';
import Prompt from '../models/Prompt.js';
import { imageQueue } from '../config/queue.js';

class JobController {
  async getAll(req, res) {
    try {
      const { status, jobType } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (jobType) filter.jobType = jobType;

      const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(100);
      res.json({ success: true, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getStats(req, res) {
    try {
      const stats = await Job.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        total: await Job.countDocuments(),
        byStatus: stats.reduce((acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        }, {})
      };

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }
      res.json({ success: true, data: job });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async generateImages(req, res) {
    try {
      const { promptIds, accountIds, config } = req.body;

      const prompts = await Prompt.find({ _id: { $in: promptIds } });
      const jobs = [];

      for (const prompt of prompts) {
        for (const accountId of accountIds) {
          const job = await imageQueue.add({
            promptId: prompt._id,
            promptText: prompt.promptText,
            accountId,
            config
          });
          jobs.push(job.id);
        }
      }

      res.json({ 
        success: true, 
        message: `${jobs.length} image generation jobs queued`,
        jobIds: jobs
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async retry(req, res) {
    try {
      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      job.status = 'pending';
      job.error = null;
      await job.save();

      res.json({ success: true, message: 'Job queued for retry' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async cancel(req, res) {
    try {
      const job = await Job.findByIdAndUpdate(
        req.params.id,
        { status: 'cancelled' },
        { new: true }
      );
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }
      res.json({ success: true, message: 'Job cancelled' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new JobController();