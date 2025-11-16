import Account from '../models/Account.js';
import csv from 'csv-parser';
import fs from 'fs';
import { loginQueue } from '../services/QueueService.js';

class AccountController {
  // Get all accounts
  async getAll(req, res) {
    try {
      const { status, source, page = 1, limit = 50 } = req.query;
      
      const query = {};
      if (status) query.status = status;
      if (source) query.source = source;

      const accounts = await Account.find(query)
        .select('-password') // Don't return passwords
        .populate('projects', 'name status')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Account.countDocuments(query);

      res.json({
        success: true,
        data: accounts,
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

  // Get account by ID
  async getById(req, res) {
    try {
      const account = await Account.findById(req.params.id)
        .select('-password')
        .populate('projects');

      if (!account) {
        return res.status(404).json({ 
          success: false, 
          error: 'Account not found' 
        });
      }

      res.json({ success: true, data: account });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Create account manually
  async create(req, res) {
    try {
      const { email, password, recoveryEmail, twoFASecret, phone } = req.body;

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
        recoveryEmail,
        twoFASecret,
        phone,
        source: 'manual',
        status: 'login-required'
      });

      res.json({ 
        success: true, 
        data: account,
        message: 'Account created. Please login manually to activate.'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Import CSV
  async importCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'No file uploaded' 
        });
      }

      const accounts = [];
      const errors = [];
      const filePath = req.file.path;

      // Parse CSV
      const stream = fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Validate required fields
          if (!row.email || !row.password) {
            errors.push(`Missing required fields: ${JSON.stringify(row)}`);
            return;
          }

          accounts.push({
            email: row.email.toLowerCase().trim(),
            password: row.password,
            recoveryEmail: row.recover_mail || '',
            twoFASecret: row.twoFA || '',
            status: 'login-required',
            source: 'csv-import'
          });
        })
        .on('end', async () => {
          try {
            // Bulk insert with error handling
            const results = [];
            for (const acc of accounts) {
              try {
                const existing = await Account.findOne({ email: acc.email });
                if (!existing) {
                  const created = await Account.create(acc);
                  results.push(created);
                } else {
                  errors.push(`Duplicate: ${acc.email}`);
                }
              } catch (err) {
                errors.push(`Failed: ${acc.email} - ${err.message}`);
              }
            }

            // Cleanup uploaded file
            fs.unlinkSync(filePath);

            res.json({
              success: true,
              imported: results.length,
              total: accounts.length,
              errors: errors.length > 0 ? errors : undefined,
              message: `Successfully imported ${results.length}/${accounts.length} accounts`
            });
          } catch (error) {
            fs.unlinkSync(filePath);
            res.status(500).json({ 
              success: false, 
              error: error.message 
            });
          }
        })
        .on('error', (error) => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          res.status(500).json({ 
            success: false, 
            error: error.message 
          });
        });

    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Start manual login
  async startManualLogin(req, res) {
    try {
      const { id } = req.params;
      const account = await Account.findById(id);

      if (!account) {
        return res.status(404).json({ 
          success: false, 
          error: 'Account not found' 
        });
      }

      // Add job to login queue
      const job = await loginQueue.add('manual-login', {
        accountId: account._id.toString(),
        email: account.email,
        password: account.password,
        twoFASecret: account.twoFASecret
      });

      // Update account status
      account.status = 'processing';
      account.loginAttempts += 1;
      await account.save();

      res.json({
        success: true,
        jobId: job.id,
        message: 'Chrome browser will open. Please complete login manually.'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Update account
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow updating certain fields
      delete updates._id;
      delete updates.createdAt;
      delete updates.updatedAt;

      const account = await Account.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      if (!account) {
        return res.status(404).json({ 
          success: false, 
          error: 'Account not found' 
        });
      }

      res.json({ success: true, data: account });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Delete account
  async delete(req, res) {
    try {
      const account = await Account.findByIdAndDelete(req.params.id);

      if (!account) {
        return res.status(404).json({ 
          success: false, 
          error: 'Account not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Account deleted successfully' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Get account statistics
  async getStats(req, res) {
    try {
      const stats = await Account.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        total: await Account.countDocuments(),
        byStatus: {},
        bySource: {}
      };

      stats.forEach(stat => {
        result.byStatus[stat._id] = stat.count;
      });

      const sourceStats = await Account.aggregate([
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 }
          }
        }
      ]);

      sourceStats.forEach(stat => {
        result.bySource[stat._id] = stat.count;
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

export default new AccountController();