import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  sessionCookie: {
    type: String,
    default: ''
  },
  profilePath: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'pending', 'expired'],
    default: 'pending'
  },
  blockReason: String,
  blockError: String,
  blockedAt: Date,
  lastChecked: Date,
  projects: [{
    type: String
  }]
}, {
  timestamps: true
});

export default mongoose.model('Account', accountSchema);