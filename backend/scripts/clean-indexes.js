import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function cleanIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whisk-automation');
    
    const db = mongoose.connection.db;
    const collection = db.collection('accounts');
    
    console.log('=== Cleaning Database Indexes ===\n');
    
    // Lấy danh sách indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:');
    indexes.forEach(idx => console.log(`  - ${idx.name}`));
    console.log('');
    
    // Xóa index accountId_1 nếu tồn tại
    try {
      await collection.dropIndex('accountId_1');
      console.log('✓ Dropped accountId_1 index\n');
    } catch (err) {
      console.log('ℹ Index accountId_1 not found (OK)\n');
    }
    
    // Rebuild indexes từ schema
    const Account = (await import('../src/models/Account.js')).default;
    await Account.syncIndexes();
    console.log('✓ Synced indexes from schema\n');
    
    // Hiển thị indexes mới
    const newIndexes = await collection.indexes();
    console.log('New indexes:');
    newIndexes.forEach(idx => console.log(`  - ${idx.name}`));
    
    console.log('\n=== Done! ===');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanIndexes();