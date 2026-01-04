# Contributing to i18nkit

Guidelines and instructions for contributing to this project.

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.
When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Environment details**: Node.js version, OS, package version
- **Code samples** or minimal reproduction if applicable

### Suggesting Features

Feature requests are welcome. Please:

- Check existing issues for similar requests
- Describe the use case and expected behavior
- Explain why this feature would be useful to most users

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main` for your changes
3. **Make your changes** following the code style guidelines
4. **Write or update tests** for your changes
5. **Run the test suite** to ensure all tests pass
6. **Submit a PR** with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/i18nkit.git
cd i18nkit

# Install dependencies
npm install

# Link for local testing
npm link

# Run tests
npm test

# Run linter
npm run lint

# Check formatting
npm run format:check
```

## Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run format` before committing
- Follow existing patterns in the codebase
- Use ES2024 features (the project requires Node.js 22+)

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```
feat(extract): add support for p-calendar component
fix(apply): handle nested transloco expressions
docs(readme): add troubleshooting section
```

## Testing

- Write tests for new features
- Ensure existing tests pass
- Use Node.js built-in test runner
- Place tests in `tests/` directory with `.test.js` extension

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Project Structure

```
i18nkit/
├── bin/
│   └── cli.js          # CLI entry point
├── types/
│   └── index.d.ts      # TypeScript definitions
├── tests/
│   └── *.test.js       # Test files
├── examples/
│   ├── i18nkit.config.js
│   └── .i18n-keys.json
└── package.json
```

## Release Process

Releases are automated via GitHub Actions when a release is published:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a GitHub release with tag `vX.Y.Z`
4. CI will publish to npm with provenance

## Questions?

Open an issue for questions or join discussions.
