---
name: npm-supply-chain
description: How to add and update npm dependencies safely. Use when installing a package, when guardrails-js asks about an install, when picking between similar packages, when setting up CI, or when a dependency turns out to be compromised.
---

# npm without getting owned

Installing a package runs its code. `preinstall` and `postinstall` scripts execute with your permissions, on your machine, before you have read a line of it. Treat every install as running an unknown program.

## Before you add a package

1. Check the name character by character. `expres`, `mongose`, `crossenv`, and `lodahs` have all been real attacks. An assistant that suggests a package name may have made it up, and attackers register invented names within hours of them appearing in model output.
2. Confirm it exists and looks alive: `npm view <name>`. Look at the publish date, the version count, and whether there is a repository link.
3. Prefer packages you already depend on, or the standard library. The safest dependency is the one you did not add.

## Installing

```bash
npm install --ignore-scripts <name>@<exact-version>
```

Then read what the install scripts would have done before you decide to run them:

```bash
npm ls <name>
cat node_modules/<name>/package.json
```

Set it as the default for the project:

```bash
npm config set ignore-scripts true --location=project
```

Some packages genuinely need their build step. Run those explicitly rather than turning the setting off globally.

## In CI

- `npm ci`, never `npm install`. It requires a lockfile, refuses to update the manifest, and fails when the two disagree.
- `npm audit signatures` to check registry signatures and provenance.
- Run installs in a container that holds no credentials. The 2025 worm campaigns spread by stealing tokens out of build environments.
- Pin GitHub Actions to a commit sha, not a tag.

## What went wrong before, and what it teaches

- September 2025, chalk and debug and about eighteen related packages: a maintainer account was taken over and popular packages shipped a wallet stealer. Being popular is not a safety signal.
- Shai-Hulud, September and November 2025: a worm that stole npm and cloud credentials, then used them to publish itself into more packages. Cleaning one package was not enough, because the credentials it took were still valid.
- event-stream, 2018: a maintainer handed the project to a stranger who added a malicious dependency. Ownership changes matter.
- ua-parser-js, 2021: account takeover, three malicious versions. Version pinning would have limited the blast radius.

The common thread is that none of these were detectable from the package name, the download count, or the star count.

## If you find out you installed something bad

1. Do not just delete `node_modules`. Assume anything the process could read is gone.
2. Rotate npm tokens, GitHub tokens, cloud keys, and anything in `.env` on that machine.
3. Check `~/.npmrc`, CI logs, and any self hosted runner. The 2025 campaigns left persistence there.
4. Pin the last known good version in the lockfile and rebuild from a clean checkout.

## Keeping the tree honest

- Commit the lockfile. Review lockfile diffs in pull requests, not just `package.json`.
- Use `overrides` to force a patched version of a transitive dependency.
- Generate an SBOM at build time so you can answer "are we affected" in minutes instead of days.
- Wait a few days before taking a brand new release of anything important. Most compromised releases are pulled within hours.
