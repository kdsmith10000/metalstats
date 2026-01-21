# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Measures

This application implements the following security measures:

### 1. HTTP Security Headers
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables XSS filtering
- **Content-Security-Policy**: Restricts resource loading to prevent XSS attacks
- **Referrer-Policy**: Controls referrer information sharing
- **Permissions-Policy**: Restricts browser features

### 2. Input Validation & Sanitization
- All numeric inputs are validated and sanitized
- Data structure validation before processing
- Protection against NaN and Infinity values
- Non-negative number enforcement

### 3. Dependency Security
- Regular dependency audits using `npm audit`
- Up-to-date dependencies with security patches
- No known vulnerabilities in dependencies

### 4. Code Security
- No use of `dangerouslySetInnerHTML`
- No use of `eval()` or `Function()` constructors
- React's built-in XSS protection for all user-facing content
- TypeScript for type safety

### 5. Environment Security
- Environment variables excluded from version control
- No hardcoded secrets or API keys
- Secure credential handling

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to: security@example.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue responsibly.

## Security Best Practices

### For Developers
- Never commit secrets or API keys
- Keep dependencies up to date
- Review security headers regularly
- Test with security scanning tools
- Follow OWASP Top 10 guidelines

### For Deployment
- Use HTTPS only
- Enable HSTS
- Regular security audits
- Monitor for dependency vulnerabilities
- Keep deployment environment secure

## Security Checklist

- [x] Security headers configured
- [x] Input validation implemented
- [x] XSS protection enabled
- [x] CSRF protection (via Next.js)
- [x] Dependency vulnerabilities checked
- [x] No hardcoded secrets
- [x] Environment variables secured
- [x] Error handling without information leakage

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
