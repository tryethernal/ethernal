# Security Policy

## Reporting a vulnerability

Please report security issues privately. Do not open a public issue or pull request.

- **Preferred:** use GitHub's private reporting: [Report a vulnerability](https://github.com/tryethernal/ethernal/security/advisories/new) (Security tab → "Report a vulnerability").
- **Alternative:** email contact@tryethernal.com with "Security" in the subject.

Please include the affected version or commit, the steps to reproduce, and the impact you observed.

## What to expect

- We acknowledge reports within 3 business days.
- We keep you updated while we confirm and fix the issue.
- Once a fix is released, we publish a GitHub Security Advisory and credit the reporter, unless you prefer to stay anonymous.

## Scope

- This repository: the backend (`run/`), the frontend, the self-hosted installer and Docker setup.
- The hosted service at tryethernal.com and app.tryethernal.com.

Please test only against your own local or self-hosted instance. Do not run tests against the hosted service or other people's explorers, access data that is not yours, or degrade the service for others.

## Supported versions

Security fixes go into the latest release. Self-hosted operators should keep up with the latest version.
