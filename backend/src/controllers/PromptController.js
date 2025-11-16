import Prompt from '../models/Prompt.js';
import fs from 'fs-extra';

class PromptController {
  async getAll(req, res) {
    try {
      const prompts = await Prompt.find({ isActive: true }).sort({ createdAt: -1 });
      res.json({ success: true, data: prompts });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const prompt = await Prompt.create(req.body);
      res.status(201).json({ success: true, data: prompt });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const content = await fs.readFile(req.file.path, 'utf8');
      const data = JSON.parse(content);
      
      let prompts = [];
      if (Array.isArray(data)) {
        prompts = data.map(text => ({ promptText: text }));
      } else if (data.prompts && Array.isArray(data.prompts)) {
        prompts = data.prompts.map(text => ({ promptText: text }));
      }

      const created = await Prompt.insertMany(prompts);
      await fs.remove(req.file.path);

      res.status(201).json({ success: true, data: created, count: created.length });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      const prompt = await Prompt.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!prompt) {
        return res.status(404).json({ success: false, error: 'Prompt not found' });
      }
      res.json({ success: true, data: prompt });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const prompt = await Prompt.findByIdAndDelete(req.params.id);
      if (!prompt) {
        return res.status(404).json({ success: false, error: 'Prompt not found' });
      }
      res.json({ success: true, message: 'Prompt deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new PromptController();