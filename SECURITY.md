# Security Policy

FDC3 Sail adheres to the [FINOS Security Vulnerabilities Responsible Disclosure Policy](https://community.finos.org/docs/governance/software-projects/cve-responsible-disclosure).
If you believe you have found a security vulnerability in FDC3 Sail, please report it
privately using one of the methods below — **do not** open a public GitHub Issue.

## Supported Versions

Only the latest release is supported. Earlier releases (v1.0.0 Electron agent, v2.0.0 browser demo)
were demos marked "not intended for production" and receive no fixes. From 3.0.0 on, breaking changes
are listed under a "Breaking changes" heading in each [GitHub release](https://github.com/finos/FDC3-Sail/releases).

## Verifying Releases

Our npm packages (`@finos/sail-browser-agent`, `@finos/sail-platform`) are published from the
[Release workflow](.github/workflows/release.yml) with [npm provenance](https://docs.npmjs.com/generating-provenance-statements).
Each release is signed through [Sigstore](https://www.sigstore.dev/) and linked to the exact commit and
workflow run that built it. You do not need to fetch any keys yourself: npm gets the public keys from the registry.

To check a release:

1. **From the command line.** In a project that has installed the packages, run:

   ```bash
   npm audit signatures
   ```

   It checks the registry signature and the provenance attestation of each installed package, and reports any that fail.

2. **On npmjs.com.** Open the package page (for example [@finos/sail-browser-agent](https://www.npmjs.com/package/@finos/sail-browser-agent)).
   Under **Provenance**, check that the source commit is in `finos/FDC3-Sail` and that the build ran from `.github/workflows/release.yml`.

Provenance covers releases published after it was turned on. Earlier releases have registry signatures only.

## Reporting a Vulnerability

- **GitHub private vulnerability reporting (preferred):** use the ["Report a vulnerability"](https://github.com/finos/FDC3-Sail/security/advisories/new) button under this repository's **Security** tab.
- **Email:** the maintainers listed in [MAINTAINERS.md](MAINTAINERS.md), cc [security@finos.org](mailto:security@finos.org).

We will acknowledge your report within 5 working days, give a triage outcome within 14 days,
and update you at least every 30 days while a confirmed issue is open. Fixes are released and
disclosed in accordance with the FINOS policy above.

Vulnerabilities in the FDC3 standard itself should be reported to [finos/FDC3](https://github.com/finos/FDC3/security/policy).
