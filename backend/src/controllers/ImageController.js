import Image from '../models/Image.js';
import path from 'path';

class ImageController {
  async getAll(req, res) {
    try {
      const { accountId, promptId } = req.query;
      const filter = {};
      if (accountId) filter.accountId = accountId;
      if (promptId) filter.promptId = promptId;

      const images = await Image.find(filter).sort({ createdAt: -1 });
      res.json({ success: true, data: images });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const image = await Image.findOne({ imageId: req.params.id });
      if (!image) {
        return res.status(404).json({ success: false, error: 'Image not found' });
      }
      res.json({ success: true, data: image });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async download(req, res) {
    try {
      const image = await Image.findOne({ imageId: req.params.id });
      if (!image) {
        return res.status(404).json({ success: false, error: 'Image not found' });
      }
      res.download(image.filepath, image.filename);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const image = await Image.findOneAndDelete({ imageId: req.params.id });
      if (!image) {
        return res.status(404).json({ success: false, error: 'Image not found' });
      }
      res.json({ success: true, message: 'Image deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new ImageController();