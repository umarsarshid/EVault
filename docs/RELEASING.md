# Releasing Evidence Vault

This project follows Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.

## Release steps

1) Update the version in `package.json`.
2) Commit your changes.
3) Tag the release and push the tag.

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## GitHub Release workflow

On tag push (`v*.*.*`), GitHub Actions:

- installs dependencies
- builds the app (`pnpm build`)
- zips the `dist/` folder
- attaches the ZIP to the GitHub Release

The ZIP is named: `evidence-vault-vX.Y.Z.zip`.
