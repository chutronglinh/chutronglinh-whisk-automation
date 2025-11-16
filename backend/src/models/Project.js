import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  workflowId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // UUID format validation
    match: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
    default: 'active'
  },
  imageCount: {
    type: Number,
    default: 0
  },
  lastGeneration: {
    type: Date,
    default: null
  },
  metadata: {
    tool: {
      type: String,
      default: 'BACKBONE'
    },
    sessionId: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

// Indexes
projectSchema.index({ accountId: 1, status: 1 });
projectSchema.index({ workflowId: 1 });
projectSchema.index({ createdAt: -1 });

// Method to increment image count
projectSchema.methods.incrementImageCount = async function() {
  this.imageCount += 1;
  this.lastGeneration = new Date();
  await this.save();
};

const Project = mongoose.model('Project', projectSchema);

export default Project;