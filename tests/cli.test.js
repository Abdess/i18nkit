const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const CLI_PATH = path.join(__dirname, '..', 'bin', 'cli.js');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function runCLI(args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CLI_PATH, ...args], {
      cwd: options.cwd || FIXTURES_DIR,
      env: { ...process.env, ...options.env },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', data => {
      stdout += data.toString();
    });
    proc.stderr.on('data', data => {
      stderr += data.toString();
    });
    proc.on('close', code => {
      resolve({ code, stdout, stderr });
    });
    proc.on('error', reject);
  });
}

function setupFixtures() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.mkdirSync(path.join(FIXTURES_DIR, 'src', 'app'), { recursive: true });
}

function cleanupFixtures() {
  fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

function writeTestTemplate(content) {
  fs.writeFileSync(path.join(FIXTURES_DIR, 'src', 'app', 'test.component.html'), content);
}

function writeTestFile(filename, content) {
  fs.writeFileSync(path.join(FIXTURES_DIR, 'src', 'app', filename), content);
}

function cleanAppFiles() {
  const appDir = path.join(FIXTURES_DIR, 'src', 'app');
  const files = fs.readdirSync(appDir).filter(f => f.endsWith('.html') || f.endsWith('.ts'));
  files.forEach(file => fs.unlinkSync(path.join(appDir, file)));
}

describe('CLI: help', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('should display help message', async () => {
    const { code, stdout } = await runCLI(['--help']);
    assert.equal(code, 0);
    assert.match(stdout, /i18nkit/);
    assert.match(stdout, /Universal/);
    assert.match(stdout, /GLOBAL OPTIONS/);
    assert.match(stdout, /PLUGINS/);
  });

  it('should display help with -h alias', async () => {
    const { code, stdout } = await runCLI(['-h']);
    assert.equal(code, 0);
    assert.match(stdout, /USAGE:/);
  });
});

describe('CLI: version', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('should display version information', async () => {
    const { code, stdout } = await runCLI(['--version']);
    assert.equal(code, 0);
    assert.match(stdout, /i18nkit v\d+\.\d+\.\d+/);
    assert.match(stdout, /Node\.js v\d+/);
  });

  it('should display version with -v alias', async () => {
    const { code, stdout } = await runCLI(['-v']);
    assert.equal(code, 0);
    assert.match(stdout, /i18nkit/);
  });
});

describe('CLI: extraction', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  beforeEach(() =>
    writeTestTemplate(`
    <h1>Welcome to our app</h1>
    <p>This is a test paragraph</p>
    <button>Click me</button>
    <p-button label="Submit" />
  `),
  );

  it('should extract strings in dry-run mode', async () => {
    const { code, stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.equal(code, 0);
    assert.match(stdout, /Welcome to our app/);
    assert.match(stdout, /Click me/);
  });

  it('should respect --src option', async () => {
    const { code, stdout } = await runCLI(['--dry-run', '--src', 'src/app']);
    assert.equal(code, 0);
    assert.match(stdout, /Strings found/);
  });

  it('should support flat format', async () => {
    const { code } = await runCLI(['--dry-run', '--format', 'flat']);
    assert.equal(code, 0);
  });
});

describe('CLI: strict mode', () => {
  before(setupFixtures);
  after(cleanupFixtures);
  beforeEach(() => writeTestTemplate('<h1>Untranslated string</h1>'));

  it('should exit 1 when untranslated strings found', async () => {
    const { code } = await runCLI(['--strict', '--dry-run']);
    assert.equal(code, 1);
  });
});

describe('CLI: exit codes', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('should return 0 on success with no untranslated strings', async () => {
    writeTestFile('empty.component.html', "{{ 'already.translated' | transloco }}");
    const { code } = await runCLI(['--dry-run']);
    assert.equal(code, 0);
  });

  it('should return 2 on directory not found', async () => {
    const { code } = await runCLI(['--src', 'nonexistent']);
    assert.equal(code, 2);
  });
});

describe('CLI: config file', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('should load i18nkit.config.json config', async () => {
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'i18nkit.config.json'),
      JSON.stringify({ lang: 'fr', format: 'flat' }),
    );
    const { code } = await runCLI(['--dry-run']);
    fs.unlinkSync(path.join(FIXTURES_DIR, 'i18nkit.config.json'));
    assert.equal(code, 0);
  });
});

describe('key generation', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('should generate semantic keys from text', async () => {
    fs.mkdirSync(path.join(FIXTURES_DIR, 'src', 'app', 'users'), { recursive: true });
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'src', 'app', 'users', 'profile.component.html'),
      '<h1>User Profile</h1>',
    );
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /users.*profile|profile.*titles/i);
    fs.rmSync(path.join(FIXTURES_DIR, 'src', 'app', 'users'), { recursive: true });
  });
});

describe('PrimeNG patterns', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('should extract p-button labels', async () => {
    writeTestFile('primeng.component.html', '<p-button label="Save Changes" />');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /Save Changes/);
  });

  it('should extract p-dialog headers', async () => {
    writeTestFile('primeng.component.html', '<p-dialog header="Confirmation Required"></p-dialog>');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /Confirmation Required/);
  });

  it('should extract p-table emptyMessage', async () => {
    writeTestFile('primeng.component.html', '<p-table emptyMessage="No records found"></p-table>');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /No records found/);
  });
});

describe('command routing', () => {
  before(() => {
    setupFixtures();
    fs.mkdirSync(path.join(FIXTURES_DIR, 'i18n'), { recursive: true });
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'i18n', 'en.json'),
      JSON.stringify({ app: { title: 'Test' } }),
    );
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'i18n', 'fr.json'),
      JSON.stringify({ app: { title: 'Test' } }),
    );
    writeTestFile('test.html', "{{ 'app.title' | transloco }}");
  });
  after(cleanupFixtures);

  it('should route check-sync positional command', async () => {
    const { code, stdout } = await runCLI(['check-sync', '--i18n-dir', 'i18n']);
    assert.equal(code, 0);
    assert.match(stdout, /Transloco Sync Check/);
  });

  it('should route --check-sync flag command', async () => {
    const { code, stdout } = await runCLI(['--check-sync', '--i18n-dir', 'i18n']);
    assert.equal(code, 0);
    assert.match(stdout, /Transloco Sync Check/);
  });

  it('should route find-orphans positional command', async () => {
    const { code, stdout } = await runCLI([
      'find-orphans',
      '--src',
      'src/app',
      '--i18n-dir',
      'i18n',
    ]);
    assert.equal(code, 0);
    assert.match(stdout, /Transloco Find Orphan Keys/);
  });

  it('should route orphans alias command', async () => {
    const { code, stdout } = await runCLI(['orphans', '--src', 'src/app', '--i18n-dir', 'i18n']);
    assert.equal(code, 0);
    assert.match(stdout, /Transloco Find Orphan Keys/);
  });

  it('should route --find-orphans flag command', async () => {
    const { code, stdout } = await runCLI([
      '--find-orphans',
      '--src',
      'src/app',
      '--i18n-dir',
      'i18n',
    ]);
    assert.equal(code, 0);
    assert.match(stdout, /Transloco Find Orphan Keys/);
  });

  it('should route extract positional command', async () => {
    const { code, stdout } = await runCLI(['extract', '--dry-run', '--src', 'src/app']);
    assert.equal(code, 0);
    assert.match(stdout, /Transloco Extract/);
  });

  it('should default to extract without command', async () => {
    const { code, stdout } = await runCLI(['--dry-run', '--src', 'src/app']);
    assert.equal(code, 0);
    assert.match(stdout, /Transloco Extract/);
  });
});

describe('duplicate handling', () => {
  before(setupFixtures);
  after(cleanupFixtures);
  beforeEach(cleanAppFiles);

  it('should not extract same template twice via HTML and TS templateUrl', async () => {
    writeTestFile('test.component.html', '<h1>Template Content</h1>');
    writeTestFile(
      'test.component.ts',
      `@Component({ templateUrl: './test.component.html' }) export class TestComponent {}`,
    );
    const { stdout } = await runCLI(['--dry-run']);
    const jsonMatches = stdout.match(/"template_content":/gi) || [];
    assert.equal(jsonMatches.length, 1, 'Template should only be processed once');
  });

  it('should generate different scoped keys for same text in different files', async () => {
    writeTestFile('comp1.component.html', '<h1>Shared Title</h1>');
    writeTestFile('comp2.component.html', '<h1>Shared Title</h1>');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /comp1.*shared_title/i);
    assert.match(stdout, /comp2.*shared_title/i);
  });

  it('should count all unique scoped keys', async () => {
    writeTestFile('comp1.component.html', '<h1>Title A</h1><p>Text B</p>');
    writeTestFile('comp2.component.html', '<h1>Title A</h1><p>Text C</p>');
    const { stdout } = await runCLI(['--dry-run']);
    assert.match(stdout, /Strings found:\s+4/);
  });
});

describe('ignore patterns', () => {
  before(setupFixtures);
  after(cleanupFixtures);
  beforeEach(cleanAppFiles);

  it('should ignore numbers', async () => {
    writeTestFile('test.html', '<span>42</span>');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.doesNotMatch(stdout, /\b42\b.*extracted/i);
  });

  it('should ignore URLs', async () => {
    writeTestFile('test.html', '<a>https://example.com</a>');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.doesNotMatch(stdout, /https:\/\/example\.com.*extracted/i);
  });

  it('should ignore Angular control flow syntax', async () => {
    writeTestFile('test.html', '@if (condition) { <p>Text</p> }');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.doesNotMatch(stdout, /@if.*extracted/i);
  });

  it('should ignore already translated strings', async () => {
    writeTestFile('test.html', "{{ 'app.title' | transloco }}");
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /No untranslated strings found|Strings found:\s+0/i);
  });
});

describe('inline templates', () => {
  before(setupFixtures);
  after(cleanupFixtures);
  beforeEach(cleanAppFiles);

  it('should extract from inline template in component', async () => {
    writeTestFile(
      'inline.component.ts',
      `@Component({
        template: \`<h1>Inline Title</h1><p>Inline paragraph</p>\`
      })
      export class InlineComponent {}`,
    );
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /Inline Title/);
    assert.match(stdout, /Inline paragraph/);
  });

  it('should extract both inline template and TypeScript from same file', async () => {
    writeTestFile(
      'mixed.component.ts',
      `@Component({
        template: \`<button>Click Here</button>\`
      })
      export class MixedComponent {}`,
    );
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /Click Here/);
  });
});

describe('merge option', () => {
  before(setupFixtures);
  after(cleanupFixtures);
  beforeEach(cleanAppFiles);

  it('should merge with existing translations', async () => {
    const i18nDir = path.join(FIXTURES_DIR, 'src', 'assets', 'i18n');
    fs.mkdirSync(i18nDir, { recursive: true });
    fs.writeFileSync(
      path.join(i18nDir, 'fr.json'),
      JSON.stringify({ existing: { key: 'Valeur existante' } }),
    );
    writeTestFile('test.html', '<h1>New String</h1>');
    const { code, stdout } = await runCLI([
      '--dry-run',
      '--merge',
      '--output',
      path.join(i18nDir, 'fr.json'),
    ]);
    assert.equal(code, 0);
    assert.match(stdout, /Merging with existing/i);
    fs.rmSync(i18nDir, { recursive: true, force: true });
  });
});

describe('translate command', () => {
  before(() => {
    setupFixtures();
    const i18nDir = path.join(FIXTURES_DIR, 'i18n');
    fs.mkdirSync(i18nDir, { recursive: true });
    fs.writeFileSync(path.join(i18nDir, 'fr.json'), JSON.stringify({ test: { key: 'Bonjour' } }));
  });
  after(cleanupFixtures);

  it('should route --translate flag command', async () => {
    const { stdout } = await runCLI(['--translate', 'fr:en', '--i18n-dir', 'i18n', '--dry-run']);
    assert.match(stdout, /Transloco Auto-Translate|Translating/i);
  });

  it('should reject invalid translate format', async () => {
    const { code, stderr } = await runCLI(['--translate', 'invalid', '--i18n-dir', 'i18n']);
    assert.equal(code, 2);
    assert.match(stderr, /Invalid.*translate format/i);
  });

  it('should display translation header with provider info', async () => {
    const { stdout } = await runCLI(['--translate', 'fr:en', '--i18n-dir', 'i18n', '--dry-run']);
    assert.match(stdout, /Provider.*MyMemory/i);
    assert.match(stdout, /Source.*fr\.json/);
    assert.match(stdout, /Target.*en\.json/);
  });
});

function collectWatchOutput(args) {
  return new Promise(resolve => {
    const proc = spawn('node', [CLI_PATH, ...args], { cwd: FIXTURES_DIR });
    let stdout = '';
    proc.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    setTimeout(() => {
      proc.kill('SIGTERM');
      resolve(stdout);
    }, 300);
  });
}

describe('watch command', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('should recognize watch positional command', async () => {
    const stdout = await collectWatchOutput(['watch', '--src', 'src/app']);
    assert.match(stdout, /Watching|Extract/i);
  });

  it('should recognize --watch flag command', async () => {
    const stdout = await collectWatchOutput(['--watch', '--src', 'src/app']);
    assert.match(stdout, /Watching|Extract/i);
  });
});

describe('additional options', () => {
  before(setupFixtures);
  after(cleanupFixtures);
  beforeEach(cleanAppFiles);

  it('should support --lang option', async () => {
    writeTestFile('test.html', '<h1>Test Title</h1>');
    const { code } = await runCLI(['--dry-run', '--lang', 'de']);
    assert.equal(code, 0);
  });

  it('should support --include-translated option', async () => {
    writeTestFile('test.html', "{{ 'app.title' | transloco }}<h1>New Text</h1>");
    const { code } = await runCLI(['--dry-run', '--include-translated']);
    assert.equal(code, 0);
  });

  it('should support --extract-ts-objects option', async () => {
    writeTestFile(
      'constants.ts',
      `export const MESSAGES = {
        title: 'Application Title',
        subtitle: 'Welcome message'
      };`,
    );
    const { stdout } = await runCLI(['--dry-run', '--extract-ts-objects', '--verbose']);
    assert.match(stdout, /Application Title|title/i);
  });
});

describe('edge cases', () => {
  before(setupFixtures);
  after(cleanupFixtures);
  beforeEach(cleanAppFiles);

  it('should handle empty HTML file', async () => {
    writeTestFile('empty.html', '');
    const { code, stdout } = await runCLI(['--dry-run']);
    assert.equal(code, 0);
    assert.match(stdout, /Strings found:\s+0|No untranslated/i);
  });

  it('should handle special characters in text', async () => {
    writeTestFile('special.html', '<p>Prix: 100€ & TVA</p>');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /Prix.*100.*TVA|prix/i);
  });

  it('should handle multiline text content', async () => {
    writeTestFile(
      'multiline.html',
      `<p>
        First line
        Second line
      </p>`,
    );
    const { code } = await runCLI(['--dry-run']);
    assert.equal(code, 0);
  });

  it('should handle nested HTML elements correctly', async () => {
    writeTestFile('nested.html', '<div><span>Nested Text</span></div>');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /Nested Text/);
  });

  it('should handle multiple attributes on same element', async () => {
    writeTestFile(
      'attrs.html',
      '<input placeholder="Enter name" aria-label="Name input" title="Your name">',
    );
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.match(stdout, /Enter name/);
    assert.match(stdout, /Name input/);
    assert.match(stdout, /Your name/);
  });

  it('should ignore whitespace-only content', async () => {
    writeTestFile('whitespace.html', '<p>   </p>');
    const { code, stdout } = await runCLI(['--dry-run']);
    assert.equal(code, 0);
    assert.match(stdout, /Strings found:\s+0|No untranslated/i);
  });

  it('should ignore interpolation expressions', async () => {
    writeTestFile('interp.html', '<p>{{ user.name }}</p>');
    const { stdout } = await runCLI(['--dry-run', '--verbose']);
    assert.doesNotMatch(stdout, /user\.name.*extracted/i);
  });

  it('should handle component without decorator', async () => {
    writeTestFile('plain.ts', 'export class PlainService { name = "Test"; }');
    const { code } = await runCLI(['--dry-run']);
    assert.equal(code, 0);
  });
});
