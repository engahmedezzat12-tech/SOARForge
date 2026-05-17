# SOARForge Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| DATABASE_URL | Production | PostgreSQL connection string |
| AUTH_SECRET | Production | Session/auth signing secret |
| NEXTAUTH_URL | Production | Public application URL |
| HTTP_PROXY | Optional | Enterprise proxy for HTTP sources |
| HTTPS_PROXY | Optional | Enterprise proxy for HTTPS sources |
| NO_PROXY | Optional | Proxy bypass list |
| SOARFORGE_BUNDLE_PUBLIC_KEY | Offline mode | Public key for offline bundle verification |
| SOARFORGE_ENCRYPTION_KEY | Production | Encryption key for secrets at rest |
| SOARFORGE_SUPPORT_EMAIL | Commercial | Customer support contact |
| SOARFORGE_LICENSE_KEY | Commercial | License key placeholder |
