import mongoose from 'mongoose';

const generatedImageSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
    default: null
  },
  workflowId: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  encodedImage: {
    type: String,
    default: null,
    select: false // Don't include by default (large data)
  },
  metadata: {
    imageModel: {
      type: String,
      default: 'IMAGEN_3_5'
    },
    aspectRatio: {
      type: String,
      default: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
    },
    mediaCategory: {
      type: String,
      default: 'MEDIA_CATEGORY_BOARD'
    },
    seed: {
      type: Number,
      default: null
    },
    tool: {
      type: String,
      default: 'BACKBONE'
    },
    sessionId: {
      type: String,
      default: null
    },
    generationTime: {
      type: Number, // milliseconds
      default: null
    }
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  error: {
    type: String,
    default: null
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
generatedImageSchema.index({ accountId: 1, status: 1 });
generatedImageSchema.index({ projectId: 1 });
generatedImageSchema.index({ promptId: 1 });
generatedImageSchema.index({ generatedAt: -1 });
generatedImageSchema.index({ status: 1, createdAt: -1 });

// Virtual for image URL path
generatedImageSchema.virtual('imagePath').get(function() {
  return `/output/images/${this.filename}`;
});

generatedImageSchema.set('toJSON', { virtuals: true });
generatedImageSchema.set('toObject', { virtuals: true });

const GeneratedImage = mongoose.model('GeneratedImage', generatedImageSchema);

export default GeneratedImage;