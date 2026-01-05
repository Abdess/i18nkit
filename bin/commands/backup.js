'use strict';

/**
 * @fileoverview CLI commands for backup management.
 * @module commands/backup
 */

const backup = require('../core/backup');

function formatDate(isoString) {
  return new Date(isoString).toLocaleString();
}

function getSessionAgeString(session) {
  const preview = backup.getCleanupPreview(process.cwd());
  const found = preview.toKeep.find(s => s.id === session.id);
  const hasAge = found?.age !== undefined;
  return hasAge ? `${found.age}d` : '';
}

function formatSessionRow(session) {
  const status = session.status.padEnd(12);
  const files = String(session.fileCount).padStart(3);
  const age = getSessionAgeString(session).padStart(4);
  return `${session.id} | ${status} | ${files} | ${age} | ${session.command || ''}`;
}

function logListHeader(log) {
  log('\nBackup Sessions:');
  log('-'.repeat(100));
  log('ID                                    | Status       | Files | Age  | Command');
  log('-'.repeat(100));
}

function logListFooter(sessions, log) {
  log('-'.repeat(100));
  log(`Total: ${sessions.length} sessions\n`);
  const latestId = backup.Session.getLatestId(process.cwd());
  if (latestId) {
    log(`Latest: ${latestId}`);
  }
}

function listBackups(ctx) {
  const { cwd, log } = ctx;
  const sessions = backup.listBackupSessions(cwd);
  if (sessions.length === 0) {
    log('No backup sessions found');
    return;
  }
  logListHeader(log);
  sessions.forEach(session => log(formatSessionRow(session)));
  logListFooter(sessions, log);
}

function logInfoHeader(manifest, log) {
  log('\nSession Details:');
  log('-'.repeat(60));
  log(`ID:        ${manifest.id}`);
  log(`Status:    ${manifest.status}`);
  log(`Command:   ${manifest.command}`);
  log(`Timestamp: ${formatDate(manifest.timestamp)}`);
  log(`Files:     ${manifest.files.length}`);
  log('-'.repeat(60));
}

function logInfoFiles(files, log) {
  if (files.length > 0) {
    log('\nBacked Up Files:');
    files.forEach(file => log(`  ${file.original} (${file.size} bytes)`));
  }
}

function showBackupInfo(ctx) {
  const { cwd, sessionId, log } = ctx;
  const session = backup.getBackupSession(cwd, sessionId);
  if (!session) {
    log(`Session not found: ${sessionId}`);
    return;
  }
  const { manifest } = session;
  logInfoHeader(manifest, log);
  logInfoFiles(manifest.files, log);
  if (manifest.error) {
    log(`\nError: ${manifest.error.message}`);
  }
}

function logRestoreResult(result, log) {
  log(`\nRestored: ${result.restored} files`);
  if (result.skipped > 0) {
    log(`Skipped:  ${result.skipped} files`);
  }
}

function restoreBackup(ctx) {
  const { cwd, sessionId, dryRun, verbose, log } = ctx;
  const targetId = sessionId || backup.Session.getLatestId(cwd);
  if (!targetId) {
    log('No backup sessions found');
    return;
  }
  const prefix = dryRun ? '[DRY RUN] Would restore' : 'Restoring';
  log(`\n${prefix} from: ${targetId}`);
  const result = backup.restoreSession(cwd, targetId, { dryRun, verbose, log });
  logRestoreResult(result, log);
}

function logCleanupPreview(preview, log) {
  log('\nCleanup Preview:');
  log(`Would keep:   ${preview.toKeep.length} sessions`);
  log(`Would delete: ${preview.toDelete.length} sessions`);
  if (preview.toDelete.length > 0) {
    log('\nSessions to delete:');
    preview.toDelete.forEach(s => log(`  ${s.id} (${s.age} days old, ${s.fileCount} files)`));
  }
}

function logCleanupResult(result, log) {
  log(`\nDeleted: ${result.deleted} sessions`);
  log(`Kept:    ${result.kept} sessions`);
}

function cleanupBackups(ctx) {
  const { cwd, maxSessions = 10, maxAgeDays = 30, dryRun, verbose, log } = ctx;
  if (dryRun) {
    const preview = backup.getCleanupPreview(cwd, { maxSessions, maxAgeDays });
    logCleanupPreview(preview, log);
    return;
  }
  const result = backup.cleanupOldSessions(cwd, { maxSessions, maxAgeDays, verbose, log });
  logCleanupResult(result, log);
}

function initBackupStructure(ctx) {
  const { cwd, autoAddGitignore = false, verbose, log } = ctx;
  const result = backup.initializeBackupStructure(cwd, { autoAddGitignore, verbose, log });
  log('\nBackup structure initialized');
  if (result.suggestion) {
    log(`\nTip: ${result.suggestion.message}`);
  }
}

function parseSessionIdArg(args, flagIndex) {
  const nextArg = args[flagIndex + 1];
  const isValidArg = nextArg && !nextArg.startsWith('--');
  return isValidArg ? nextArg : null;
}

function parseIntArg(args, flag, defaultValue) {
  const idx = args.indexOf(flag);
  const hasFlag = idx !== -1;
  return hasFlag ? parseInt(args[idx + 1], 10) : defaultValue;
}

const HANDLERS = {
  '--list-backups': (_args, ctx) => listBackups(ctx),
  '--backup-info': (args, ctx) => {
    const sessionId = parseSessionIdArg(args, args.indexOf('--backup-info'));
    if (!sessionId) {
      ctx.log('Usage: i18nkit --backup-info <session-id>');
      return undefined;
    }
    return showBackupInfo({ ...ctx, sessionId });
  },
  '--restore': (args, ctx) => {
    const sessionId = parseSessionIdArg(args, args.indexOf('--restore'));
    return restoreBackup({ ...ctx, sessionId });
  },
  '--cleanup-backups': (args, ctx) => {
    const maxSessions = parseIntArg(args, '--keep', 10);
    const maxAgeDays = parseIntArg(args, '--max-age', 30);
    return cleanupBackups({ ...ctx, maxSessions, maxAgeDays });
  },
  '--init-backups': (args, ctx) => {
    const autoAddGitignore = args.includes('--auto-gitignore');
    return initBackupStructure({ ...ctx, autoAddGitignore });
  },
};

function handleBackupCommand(args, ctx) {
  const cwd = ctx.cwd || process.cwd();
  const log = ctx.log || console.log;
  const baseCtx = {
    cwd,
    log,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    args,
  };
  for (const [flag, handler] of Object.entries(HANDLERS)) {
    if (args.includes(flag)) {
      return handler(args, baseCtx);
    }
  }
  return undefined;
}

function isBackupCommand(args) {
  return Object.keys(HANDLERS).some(cmd => args.includes(cmd));
}

module.exports = {
  name: 'backup',
  aliases: ['--list-backups', '--restore', '--cleanup-backups', '--backup-info', '--init-backups'],
  category: 'maintenance',
  description: 'Manage backup sessions and restore files',
  options: [
    { flag: '--list-backups', description: 'List all backup sessions' },
    { flag: '--backup-info <id>', description: 'Show backup session details' },
    { flag: '--restore [id]', description: 'Restore from backup (latest if no id)' },
    { flag: '--cleanup-backups', description: 'Remove old backup sessions' },
    { flag: '--keep <n>', description: 'Keep last n sessions (default: 10)' },
    { flag: '--max-age <days>', description: 'Max age in days (default: 30)' },
    { flag: '--init-backups', description: 'Initialize backup structure' },
    { flag: '--auto-gitignore', description: 'Auto-add to .gitignore' },
  ],
  examples: [
    'i18nkit --list-backups',
    'i18nkit --restore',
    'i18nkit --cleanup-backups --keep 5 --dry-run',
  ],
  run: ctx => handleBackupCommand(ctx.args, ctx),
  isBackupCommand,
  handleBackupCommand,
};
