import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String
  },
  recoveryEmail: {
    type: String,
    default: ''
  },
  twoFASecret: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['NEW', 'simple-login-pending', 'SYNCED', 'ACTIVE', 'suspended'],
    default: 'NEW'
  },
  sessionCookie: {
    type: String,
    default: null
  },
  cookies: {
    type: Array,
    default: []
  },
  lastCookieUpdate: {
    type: Date,
    default: null
  },
  source: {
    type: String,
    enum: ['manual', 'csv-import'],
    default: 'manual'
  },
  metadata: {
    profilePath: String,
    profileReady: {
      type: Boolean,
      default: false
    },
    cookieStatus: {
      type: String,
      enum: ['none', 'active', 'expired'],
      default: 'none'
    },
    loginStarted: Date,
    loginCompleted: Date,
    simpleLoginRequested: Date,
    cookieExtractionRequested: Date,
    lastError: String,
    lastErrorTime: Date
  }
}, {
  timestamps: true
});

accountSchema.index({ email: 1 });
accountSchema.index({ status: 1 });

const Account = mongoose.model('Account', accountSchema);

export default Account;