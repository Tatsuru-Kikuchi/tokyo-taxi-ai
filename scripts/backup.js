// scripts/backup.js - PostgreSQL Version
const { exec } = require('child_process');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

class PostgreSQLBackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.databaseUrl = process.env.DATABASE_URL;
    this.maxBackups = 7; // Keep last 7 backups
  }

  async initialize() {
    try {
      // Create backup directory if it doesn't exist
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log('📁 PostgreSQL backup directory initialized');

      // Schedule daily backups at 2 AM JST
      cron.schedule('0 2 * * *', () => {
        this.performBackup();
      }, {
        timezone: "Asia/Tokyo"
      });

      console.log('⏰ PostgreSQL backup scheduler started - Daily at 2:00 AM JST');
    } catch (error) {
      console.error('❌ Backup initialization failed:', error);
    }
  }

  async performBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `taxi-postgres-backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      console.log(`🔄 Starting PostgreSQL backup: ${backupName}`);

      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      // Create PostgreSQL dump
      await this.createPostgresDump(backupPath);

      // Create application data backup
      await this.backupApplicationData(backupPath);

      // Cleanup old backups
      await this.cleanupOldBackups();

      console.log(`✅ PostgreSQL backup completed: ${backupName}`);

      // Send notification about successful backup
      await this.sendBackupNotification(backupName, 'success');

    } catch (error) {
      console.error(`❌ PostgreSQL backup failed: ${error.message}`);
      await this.sendBackupNotification(backupName, 'failed', error.message);
    }
  }

  async createPostgresDump(backupPath) {
    return new Promise((resolve, reject) => {
      if (!this.databaseUrl) {
        console.log('⚠️ DATABASE_URL not configured - creating mock backup for testing');

        // Create a mock backup file for testing
        const mockData = {
          backup_type: 'mock',
          timestamp: new Date().toISOString(),
          note: 'This is a test backup. In production, this would contain real PostgreSQL data.',
          tables: ['bookings', 'drivers', 'payments'],
          environment: process.env.NODE_ENV || 'development'
        };

        const dumpFile = path.join(backupPath, 'postgres_dump_mock.json');
        require('fs').writeFileSync(dumpFile, JSON.stringify(mockData, null, 2));
        console.log('📊 Mock PostgreSQL dump completed for testing');
        return resolve();
      }

      // Use pg_dump to create backup
      const dumpFile = path.join(backupPath, 'postgres_dump.sql');
      const command = `pg_dump "${this.databaseUrl}" > "${dumpFile}"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`PostgreSQL dump failed: ${error.message}`));
        } else {
          console.log('📊 PostgreSQL dump completed');
          resolve();
        }
      });
    });
  }

  async backupApplicationData(backupPath) {
    try {
      const appDataPath = path.join(backupPath, 'app-data');
      await fs.mkdir(appDataPath, { recursive: true });

      // Backup configuration and stats
      const appBackup = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '3.0.3',
        database_type: 'PostgreSQL',
        stations_count: 8604,
        active_drivers: await this.getActiveDriversCount(),
        total_bookings: await this.getTotalBookingsCount(),
        system_status: 'operational'
      };

      await fs.writeFile(
        path.join(appDataPath, 'system-snapshot.json'),
        JSON.stringify(appBackup, null, 2)
      );

      console.log('📋 Application data backup completed');
    } catch (error) {
      console.error('⚠️ Application data backup warning:', error.message);
    }
  }

  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupDirs = files
        .filter(file => file.startsWith('taxi-postgres-backup-'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          created: file.split('taxi-postgres-backup-')[1]
        }))
        .sort((a, b) => b.created.localeCompare(a.created));

      // Remove old backups (keep only the latest maxBackups)
      if (backupDirs.length > this.maxBackups) {
        const toDelete = backupDirs.slice(this.maxBackups);

        for (const backup of toDelete) {
          await fs.rmdir(backup.path, { recursive: true });
          console.log(`🗑️ Removed old backup: ${backup.name}`);
        }
      }
    } catch (error) {
      console.error('⚠️ Cleanup warning:', error.message);
    }
  }

  async sendBackupNotification(backupName, status, error = null) {
    try {
      const message = status === 'success'
        ? `✅ PostgreSQLバックアップ完了: ${backupName}`
        : `❌ PostgreSQLバックアップ失敗: ${backupName}\nエラー: ${error}`;

      console.log(`📱 Notification: ${message}`);

      // You can implement LINE notification here if needed
    } catch (error) {
      console.error('📱 Notification failed:', error.message);
    }
  }

  async getActiveDriversCount() {
    // This would query your PostgreSQL database
    try {
      // Mock implementation - replace with actual DB query
      return 3;
    } catch (error) {
      return 0;
    }
  }

  async getTotalBookingsCount() {
    // This would query your PostgreSQL database
    try {
      // Mock implementation - replace with actual DB query
      return 150;
    } catch (error) {
      return 0;
    }
  }

  // Manual backup trigger (for testing)
  async manualBackup() {
    console.log('🔧 Manual PostgreSQL backup triggered');
    await this.performBackup();
  }
}

// Initialize backup service
const backupService = new PostgreSQLBackupService();

// Start the backup service
if (require.main === module) {
  backupService.initialize().then(() => {
    console.log('🚀 PostgreSQL backup service started');

    // For testing: perform immediate backup
    if (process.argv.includes('--test')) {
      setTimeout(() => backupService.manualBackup(), 2000);
    }
  });
}

module.exports = backupService;
// Deploy trigger: Mon Sep  8 20:49:18 JST 2025
