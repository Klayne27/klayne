# Security Policy

## Reporting a Vulnerability

Please do not open a public issue for security reports. Email `klayneaustria@gmail.com` with:

- A clear description of the vulnerability
- Steps to reproduce
- Impact and affected routes/features
- Any relevant screenshots, logs, or proof of concept details

You should receive an initial response within 72 hours. Replace the placeholder email before making the repository public.

## Supported Versions

| Version                        | Supported |
| ------------------------------ | --------- |
| `main`                         | Yes       |
| Older commits or private forks | No        |

## In Scope

- Authentication and authorization bypasses
- JWT/cookie handling issues
- Firebase Google sign-in verification issues
- Account takeover paths
- Cross-site scripting in posts, chats, profile fields, board posts, devlogs, todos, or link previews
- Injection risks affecting MongoDB queries or backend fetches
- Insecure direct object references in posts, messages, groups, todos, images, suggestions, and board resources
- Cloudinary upload/deletion abuse
- Web Push subscription abuse
- Socket.io event authorization and room access problems
- Admin-only route bypasses
- Sensitive data exposure through API responses

## Out of Scope

- Social engineering
- Physical attacks
- Denial-of-service reports without a concrete application-layer vulnerability
- Automated scanner output without a working reproduction
- Issues requiring access to someone else's device, browser profile, or email account
- Vulnerabilities in third-party services unless the report shows a Klayne-specific misconfiguration
- Missing security headers unless paired with an exploitable impact

## Secret Handling

Never commit `.env` files, Firebase service account JSON, MongoDB connection strings, Cloudinary API secrets, VAPID private keys, or production URLs containing credentials. If a secret is committed, rotate it immediately and remove it from git history before making the repository public.
