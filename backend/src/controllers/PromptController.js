import Prompt from '../models/Prompt.js';

class PromptController {
  // Get all prompts with filters
  async getAll(req, res) {
    try {
      const { 
        category, 
        status = 'active', 
        search, 
        page = 1, 
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      if (status) query.status = status;
      if (category) query.category = category;
      if (search) {
        query.$text = { $search: search };
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const prompts = await Prompt.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Prompt.countDocuments(query);

      res.json({
        success: true,
        data: prompts,
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

  // Get single prompt
  async getById(req, res) {
    try {
      const prompt = await Prompt.findById(req.params.id);

      if (!prompt) {
        return res.status(404).json({
          success: false,
          error: 'Prompt not found'
        });
      }

      res.json({
        success: true,
        data: prompt
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Create new prompt
  async create(req, res) {
    try {
      const prompt = await Prompt.create(req.body);

      res.status(201).json({
        success: true,
        data: prompt,
        message: 'Prompt created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update prompt
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Prevent updating these fields
      delete updates._id;
      delete updates.createdAt;
      delete updates.updatedAt;
      delete updates.generationCount;

      const prompt = await Prompt.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!prompt) {
        return res.status(404).json({
          success: false,
          error: 'Prompt not found'
        });
      }

      res.json({
        success: true,
        data: prompt,
        message: 'Prompt updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete prompt
  async delete(req, res) {
    try {
      const prompt = await Prompt.findByIdAndDelete(req.params.id);

      if (!prompt) {
        return res.status(404).json({
          success: false,
          error: 'Prompt not found'
        });
      }

      res.json({
        success: true,
        message: 'Prompt deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Import prompts from JSON
  async importJSON(req, res) {
    try {
      const { prompts } = req.body;

      if (!Array.isArray(prompts)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid format: prompts must be an array'
        });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const promptData of prompts) {
        try {
          // If just string, convert to object
          const data = typeof promptData === 'string' 
            ? { text: promptData }
            : promptData;

          await Prompt.create(data);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            prompt: promptData,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: results,
        message: `Imported ${results.success}/${prompts.length} prompts`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get categories
  async getCategories(req, res) {
    try {
      const categories = await Prompt.distinct('category');

      res.json({
        success: true,
        data: categories
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
        total: await Prompt.countDocuments(),
        active: await Prompt.countDocuments({ status: 'active' }),
        inactive: await Prompt.countDocuments({ status: 'inactive' }),
        byCategory: {}
      };

      const categoryStats = await Prompt.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]);

      categoryStats.forEach(stat => {
        stats.byCategory[stat._id] = stat.count;
      });

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

export default PromptController;