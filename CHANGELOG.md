# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 05-01-2026

### Changed

- Package published as scoped `@abdess76/i18nkit` on npm
- Updated documentation with correct install command

## [1.0.0] - 01-12-2025

### Added

- Initial release
- Zero-dependency CLI for i18n extraction
- Angular + Transloco support with PrimeNG patterns
- Auto-apply feature to replace hardcoded strings
- Sync check to compare language files
- Orphan key detection
- Translation API integration (MyMemory + DeepL)
- Watch mode for development
- CI mode with strict validation
- Configuration file support (i18nkit.config.js, i18nkit.config.json)
- Custom key mapping (.i18n-keys.json)
- Backup system before modifications
- Interactive mode for confirmations
- Dry-run mode for previews
- Flat and nested output formats
- ICU message format support
- ES2024 features (Array.fromAsync, Promise.withResolvers, Set.difference)

### Technical

- Pure Node.js implementation (no external dependencies)
- Requires Node.js >= 22.0.0
- Uses modern JavaScript patterns and optimizations
