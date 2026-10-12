# Contributing to Cyber Defense

Thank you for your interest in contributing to Cyber Defense: Zero Day!

## How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs or suggest features
- Include steps to reproduce, expected and actual behavior
- Attach a screenshot and the browser and wallet you used where relevant

### Submitting Pull Requests
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with clear, conventional commit messages
4. Ensure the checks pass: `npm run typecheck` and `npm run build`
5. Open a Pull Request against `main`

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add a new tower
fix: keep the chill from stacking
docs: update the hold rewards table
```

### Development Setup
See [Quick Start](README.md#quick-start) in the README. The layout of the code is in
[docs/architecture.md](docs/architecture.md); the rules of a run are in
[docs/gameplay.md](docs/gameplay.md).

### Ground Rules
- The game's code is one module, `src/modules/cyber-defense/`; modules never import each other
- Client code ships to players: no keys, tokens or other secrets in any file
- $ZDAY is neither earned nor spent in the game — a change that pays it out or sells it is out of scope

## Code of Conduct
Be respectful and constructive. We're building in public on Solana — let's keep it collaborative.

## Questions?
Open an issue, or reach out via [GitHub](https://github.com/kyora1111).
