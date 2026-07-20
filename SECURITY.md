# Security Policy

## Supported Versions

Currently, the SCMS project officially supports security updates for the `v1.x` lifecycle.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you have discovered a security vulnerability in SCMS, please DO NOT report it via public GitHub Issues. 

Instead, please send an email to our core security team at: **security@scms.edu**

You should receive a response within 24 hours acknowledging the receipt of the vulnerability. We will investigate the issue and coordinate a patch within a 14-day timeline. 

## Architectural Assurances

SCMS natively integrates protection against standard OWASP top 10 vulnerabilities:
- **Injection Flaws**: Completely mitigated by strict ORM parameterization (SQLAlchemy). No raw string SQL commands are evaluated.
- **Broken Authentication**: Handled via secure HttpOnly sessions tied to explicit `Flask-Login` contexts.
- **Cross-Site Request Forgery**: Prevented by utilizing the `Flask-WTF` CSRF token protection suite. Tokens validate against the session state before allowing mutative HTTP actions (POST/PUT/DELETE).
- **Cross-Site Scripting (XSS)**: Prevented via React's native HTML sanitization which automatically escapes variables in JSX.
