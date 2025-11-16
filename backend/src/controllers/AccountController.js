import Account from '../models/Account.js';
import fs from 'fs';

class AccountController {
  // Get all accounts
  static async getAll(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50,
        status,
        cookieStatus,
        search 
      } = req.query;

      const query = {};
      
      if (status) query.status = status;
      if (cookieStatus) query['metadata.cookieStatus'] = cookieStatus;
      if (search) {
        query.email = { $regex: search, $options: 'i' };
      }

      const accounts = await Account.find(query)
        .select('-cookies -password')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const count = await Account.countDocuments(query);

      return res.json({
        success: true,
        data: accounts,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get accounts error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get account by ID
  static async getById(req, res) {
    try {
      const account = await Account.findById(req.params.id)
        .select('-password')
        .lean();

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      return res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Get account error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get account statistics
  static async getStats(req, res) {
    try {
      const total = await Account.countDocuments();
      const active = await Account.countDocuments({ status: 'active' });
      const loginRequired = await Account.countDocuments({ status: 'login-required' });
      const suspended = await Account.countDocuments({ status: 'suspended' });
      
      const withCookies = await Account.countDocuments({ 
        'metadata.cookieStatus': 'active' 
      });

      const byCookieStatus = await Account.aggregate([
        {
          $group: {
            _id: '$metadata.cookieStatus',
            count: { $sum: 1 }
          }
        }
      ]);

      return res.json({
        success: true,
        data: {
          total,
          active,
          loginRequired,
          suspended,
          withCookies,
          byCookieStatus: byCookieStatus.reduce((acc, item) => {
            acc[item._id || 'none'] = item.count;
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Create account manually
  static async create(req, res) {
    try {
      const { email, password, recoveryEmail, twoFASecret } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      // Check if account exists
      const existing = await Account.findOne({ email });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Account already exists'
        });
      }

      const account = await Account.create({
        email,
        password,
        recoveryEmail: recoveryEmail || '',
        twoFASecret: twoFASecret || '',
        status: 'login-required',
        source: 'manual',
        metadata: {
          cookieStatus: 'none'
        }
      });

      return res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Create account error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Import accounts from CSV
  static async importCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          error: 'CSV file is empty'
        });
      }

      // Parse header to support multiple formats
      const header = lines[0].toLowerCase().trim();
      const accounts = [];
      const errors = [];
      const skipped = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim());
          
          // Support multiple CSV formats
          let email, password, recoveryEmail, twoFASecret;
          
          if (header.includes('password')) {
            // Format: email,password,recover_mail,twoFA
            [email, password, recoveryEmail, twoFASecret] = values;
          } else {
            // Format: email,recoveryEmail,twoFASecret
            [email, recoveryEmail, twoFASecret] = values;
            password = null;
          }

          if (!email) {
            skipped.push({ line: i + 1, reason: 'Empty email' });
            continue;
          }

          // Check if account already exists
          const existing = await Account.findOne({ email: email.trim() });
          if (existing) {
            skipped.push({ 
              line: i + 1, 
              email: email.trim(),
              reason: 'Account already exists' 
            });
            continue;
          }

          const account = await Account.create({
            email: email.trim(),
            password: password || undefined,
            recoveryEmail: recoveryEmail || '',
            twoFASecret: twoFASecret || '',
            status: 'login-required',
            source: 'csv-import',
            metadata: {
              cookieStatus: 'none'
            }
          });

          accounts.push({
            _id: account._id,
            email: account.email
          });

        } catch (error) {
          errors.push({
            line: i + 1,
            error: error.message
          });
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      return res.json({
        success: true,
        data: {
          imported: accounts.length,
          skipped: skipped.length,
          errors: errors.length,
          accounts: accounts,
          skippedDetails: skipped,
          errorDetails: errors
        }
      });

    } catch (error) {
      console.error('Import CSV error:', error);
      
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update account
  static async update(req, res) {
    try {
      const { status, recoveryEmail, twoFASecret, metadata } = req.body;

      const updateData = {};
      if (status) updateData.status = status;
      if (recoveryEmail !== undefined) updateData.recoveryEmail = recoveryEmail;
      if (twoFASecret !== undefined) updateData.twoFASecret = twoFASecret;
      if (metadata) updateData.metadata = { ...updateData.metadata, ...metadata };

      const account = await Account.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      return res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Update account error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete account
  static async delete(req, res) {
    try {
      const account = await Account.findByIdAndDelete(req.params.id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      return res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Start manual login (auto-fill credentials)
  static async startManualLogin(req, res) {
    try {
      const account = await Account.findById(req.params.id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      if (!account.password) {
        return res.status(400).json({
          success: false,
          error: 'Account password not set'
        });
      }

      // Update account status to trigger worker pickup
      await Account.findByIdAndUpdate(account._id, {
        $set: { 
          status: 'login-pending',
          'metadata.loginRequested': new Date()
        }
      });

      return res.json({
        success: true,
        data: {
          accountId: account._id,
          message: 'Login request queued. Worker will process shortly.'
        }
      });
    } catch (error) {
      console.error('Start manual login error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Start simple login (100% manual)
  static async startSimpleLogin(req, res) {
    try {
      const account = await Account.findById(req.params.id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      // Update account status to trigger worker pickup
      await Account.findByIdAndUpdate(account._id, {
        $set: { 
          status: 'simple-login-pending',
          'metadata.simpleLoginRequested': new Date()
        }
      });

      return res.json({
        success: true,
        data: {
          accountId: account._id,
          message: 'Simple login request queued. Browser will open for manual login.'
        }
      });
    } catch (error) {
      console.error('Start simple login error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Extract cookie from logged-in profile
  static async extractCookie(req, res) {
    try {
      const account = await Account.findById(req.params.id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      if (!account.metadata?.profileReady) {
        return res.status(400).json({
          success: false,
          error: 'Profile not ready. Please login first.'
        });
      }

      // Update account status to trigger worker pickup
      await Account.findByIdAndUpdate(account._id, {
        $set: { 
          'metadata.cookieExtractionRequested': new Date()
        }
      });

      return res.json({
        success: true,
        data: {
          accountId: account._id,
          message: 'Cookie extraction request queued'
        }
      });
    } catch (error) {
      console.error('Extract cookie error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default AccountController;