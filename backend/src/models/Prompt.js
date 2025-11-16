import mongoose from 'mongoose';

const promptSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000
  },
  category: {
    type: String,
    default: 'general',
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  metadata: {
    aspectRatio: {
      type: String,
      enum: ['IMAGE_ASPECT_RATIO_LANDSCAPE', 'IMAGE_ASPECT_RATIO_PORTRAIT', 'IMAGE_ASPECT_RATIO_SQUARE'],
      default: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
    },
    imageModel: {
      type: String,
      enum: ['IMAGEN_3', 'IMAGEN_3_5'],
      default: 'IMAGEN_3_5'
    },
    mediaCategory: {
      type: String,
      enum: ['MEDIA_CATEGORY_BOARD', 'MEDIA_CATEGORY_PHOTO'],
      default: 'MEDIA_CATEGORY_BOARD'
    },
    seed: {
      type: Number,
      default: null
    }
  },
  generationCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for search and filter
promptSchema.index({ category: 1, status: 1 });
promptSchema.index({ createdAt: -1 });
promptSchema.index({ text: 'text' }); // Text search

// Virtual for aspect ratio display name
promptSchema.virtual('aspectRatioName').get(function() {
  const ratios = {
    'IMAGE_ASPECT_RATIO_LANDSCAPE': 'Landscape',
    'IMAGE_ASPECT_RATIO_PORTRAIT': 'Portrait',
    'IMAGE_ASPECT_RATIO_SQUARE': 'Square'
  };
  return ratios[this.metadata.aspectRatio] || 'Unknown';
});

promptSchema.set('toJSON', { virtuals: true });
promptSchema.set('toObject', { virtuals: true });

const Prompt = mongoose.model('Prompt', promptSchema);

export default Prompt;