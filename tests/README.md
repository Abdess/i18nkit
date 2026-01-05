# Tests

i18nkit test suite using Node.js native test runner.

## Structure

```text
tests/
├── README.md           # This file
├── cli.test.js         # CLI integration tests
└── fixtures/           # Auto-generated test fixtures (gitignored)
```

## Run Tests

```bash
# Run all tests
npm test

# Run with verbose output
npm test -- --test-reporter=spec

# Run specific test file
node --test tests/cli.test.js
```

## Test Categories

### CLI Tests (`cli.test.js`)

Integration tests covering:

- **Help/Version**: `--help`, `-h`, `--version`, `-v`
- **Extraction**: String detection from HTML templates
- **Apply**: Pipe replacement with backup verification
- **Sync Check**: Language file comparison
- **Orphan Detection**: Unused key identification
- **Configuration**: Config file loading
- **Dry Run**: Preview mode without modifications

## Writing Tests

Tests use Node.js native test runner (no dependencies).

```javascript
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('Feature', () => {
  before(() => {
    // Setup fixtures
  });

  after(() => {
    // Cleanup
  });

  it('should work correctly', async () => {
    const result = await runCLI(['--option']);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /expected/);
  });
});
```

## Fixtures

Test fixtures are created in `tests/fixtures/` during test runs:

- `src/app/*.html` - Template files
- `src/app/*.ts` - TypeScript components
- `src/assets/i18n/*.json` - Language files
- `.i18nkit/` - Backup sessions

Fixtures are cleaned up automatically after tests.

## Backup System Tests

The backup system creates sessions in `.i18nkit/backups/`:

```text
.i18nkit/
├── .gitignore
├── report.json
└── backups/
    └── {timestamp}_{command}_{hash}/
        ├── manifest.json
        ├── report.json
        └── src/
```

### Session Manifest

```json
{
  "version": "1.0",
  "id": "2026-01-05_15-39-28_apply_ae9c",
  "timestamp": "2026-01-05T14:39:28.497Z",
  "command": "apply",
  "status": "completed",
  "files": [...],
  "reportFile": "report.json",
  "stats": { "filesModified": 3, "filesBackedUp": 3 }
}
```

### Session Status

| Status        | Description                       |
| ------------- | --------------------------------- |
| `pending`     | Session created, not started      |
| `ready`       | Files backed up, ready to modify  |
| `in_progress` | Modifications in progress         |
| `completed`   | Successfully finished             |
| `failed`      | Error occurred, may need rollback |

## Coverage

Run tests with coverage:

```bash
node --test --experimental-test-coverage tests/
```
