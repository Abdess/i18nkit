# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

Report security vulnerabilities responsibly via the channels below.

**DO NOT** open public GitHub issues for security vulnerabilities.

### How to Report

Use
[GitHub Security Advisories](https://github.com/Abdess/i18nkit/security/advisories/new)
to report vulnerabilities privately.

### What to Include

Provide:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Resolution timeline**: Depends on severity
  - Critical: 24-72 hours
  - High: 1-2 weeks
  - Medium/Low: Next release cycle

### Security Considerations

This package:

- Has **zero external dependencies** (reduced attack surface)
- Executes JavaScript config files (`.i18nkit.config.js`)
- Makes external API calls for translation (MyMemory, DeepL)
- Reads/writes files in your project directory

### Best Practices

When using i18nkit:

1. **Review config files** before running in CI/CD
2. **Use environment variables** for API keys (DEEPL_API_KEY)
3. **Run with `--dry-run`** first to preview changes
4. **Enable backups** (default) before auto-apply

### Security Features

- npm package published with **provenance** attestation
- CodeQL analysis on all PRs
- Dependency review on PRs
- Weekly security scans
- TruffleHog secrets scanning

## Attribution

Responsible disclosure is credited (unless anonymity is requested) in:

- Security advisories
- Release notes
- CHANGELOG.md
