# CloudFront + EC2 Deployment Guide

**Domain**: blogmine.ai.kr
**Architecture**: CloudFront (HTTPS) → EC2 Nginx (HTTP:80) → Docker (Backend + Frontend) → RDS PostgreSQL

## ✅ Configuration Checklist

### 1. Nginx Configuration (nginx.conf)

**Critical Settings for CloudFront**:
- ✅ `server_name blogmine.ai.kr` - Matches CloudFront origin
- ✅ `X-Forwarded-Proto https` - Forces HTTPS for backend cookie security
- ✅ `X-Forwarded-Port 443` - Correct port for HTTPS
- ✅ `set_real_ip_from 0.0.0.0/0` - Get real client IP from CloudFront
- ✅ `Strict-Transport-Security` header - HSTS for security

### 2. Backend Environment (.env)

**Required Settings**:
```bash
NODE_ENV=production
CORS_ORIGIN=https://blogmine.ai.kr  # IMPORTANT: Must match CloudFront domain
JWT_SECRET=<strong-secret-min-32-chars>
```

### 3. Cookie Settings (auth.controller.ts)

**CloudFront-Compatible Settings**:
- ✅ `httpOnly: true` - XSS protection
- ✅ `secure: true` (production) - HTTPS only
- ✅ `sameSite: 'lax'` - **Changed from 'strict'** for CloudFront compatibility
- ✅ `path: '/'` - Available across entire domain

## 🚀 Deployment Steps

### Step 1: Prepare Backend Environment

```bash
# Copy production example
cp .env.production.example backend/.env

# Edit with your RDS credentials
nano backend/.env
```

**Required Values**:
- `DB_HOST`: RDS endpoint
- `DATABASE_URL`: Complete PostgreSQL connection string
- `CORS_ORIGIN`: `https://blogmine.ai.kr`
- `JWT_SECRET`: Generate with `openssl rand -base64 32`

### Step 2: EC2 Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Clone repository
git clone <your-repo>
cd blog-mine

# Start services
docker compose -f docker-compose.prod.yml up -d

# Verify
curl http://localhost/health  # Should return "healthy"
```

### Step 3: CloudFront Configuration

**Origin Settings**:
- Origin Domain: EC2 public IP or DNS
- Protocol: HTTP only (port 80)
- Custom Headers: None

**Default Cache Behavior**:
- Viewer Protocol Policy: **Redirect HTTP to HTTPS**
- Allowed Methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**
- Cache Policy: **CachingDisabled** (dynamic content)
- Origin Request Policy: **AllViewer** (forwards all headers, cookies, query strings)

**SSL Certificate**:
- Custom SSL: ACM certificate for `blogmine.ai.kr` (must be in us-east-1)
- Security Policy: TLSv1.2_2021

**CNAMEs**: `blogmine.ai.kr`

### Step 4: Route 53

Create A record:
- Name: `blogmine.ai.kr`
- Type: A (Alias to CloudFront)
- Value: CloudFront distribution

### Step 5: Verify

1. **Health Check**: `https://blogmine.ai.kr/health`
2. **Backend API**: `https://blogmine.ai.kr/api/auth/login`
3. **Frontend**: `https://blogmine.ai.kr`

## 🔧 Fixed Issues

### Issue 1: Cookies Not Setting (FIXED)

**Problem**: `refresh_token` cookie not set because:
- Nginx forwarded `X-Forwarded-Proto: http` (actual scheme)
- Backend checked `secure: true` and saw `http` → rejected cookie

**Solution**:
```nginx
# Force HTTPS in proxy headers
proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-Port 443;
```

### Issue 2: SameSite Strict (FIXED)

**Problem**: `sameSite: 'strict'` can block cookies in some CloudFront scenarios

**Solution**: Changed to `sameSite: 'lax'` for better compatibility while maintaining security

### Issue 3: CORS Origin (FIXED)

**Problem**: Backend CORS configured for `http://localhost`

**Solution**: Updated `.env.production.example` with `CORS_ORIGIN=https://blogmine.ai.kr`

## 🔍 Troubleshooting

### Cookies Not Working

```bash
# Check backend logs
docker logs blog-mine-backend

# Verify environment
docker exec blog-mine-backend env | grep CORS_ORIGIN

# Should show: CORS_ORIGIN=https://blogmine.ai.kr
```

**Check in Browser DevTools**:
1. Network tab → Login request → Response Headers
2. Should see: `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax`

### CORS Errors

**Symptoms**: `Access-Control-Allow-Origin` error in browser console

**Fix**:
1. Check `CORS_ORIGIN` in backend/.env
2. Restart backend: `docker compose -f docker-compose.prod.yml restart backend`

### Real Client IP Not Logged

**Current**: Nginx configured to accept from any IP (`0.0.0.0/0`)

**Recommended for Production**: Restrict to CloudFront IP ranges

```nginx
# Replace in nginx.conf
set_real_ip_from 13.224.0.0/14;
set_real_ip_from 13.249.0.0/16;
set_real_ip_from 13.32.0.0/15;
# ... add all CloudFront IPv4 ranges
```

Get latest ranges: https://ip-ranges.amazonaws.com/ip-ranges.json

## 📊 Monitoring

### Application Logs

```bash
# Backend
docker logs -f blog-mine-backend

# Frontend
docker logs -f blog-mine-frontend

# Nginx access log
docker exec blog-mine-nginx tail -f /var/log/nginx/access.log

# Nginx error log
docker exec blog-mine-nginx tail -f /var/log/nginx/error.log
```

### Key Metrics to Monitor

- HTTP 5xx errors (backend issues)
- HTTP 4xx errors (client issues)
- Response times >1s (performance degradation)
- Database connection errors
- Cookie-related errors in browser console

## 🔒 Security Checklist

- [x] HTTPS enforced via CloudFront
- [x] httpOnly cookies for refresh tokens
- [x] CORS properly configured
- [x] X-Forwarded-Proto forced to https
- [x] sameSite: lax for cookie security
- [x] Security headers (HSTS, X-Frame-Options, etc.)
- [x] RDS SSL enabled
- [ ] EC2 security group restricted to CloudFront IPs
- [ ] CloudWatch monitoring enabled
- [ ] Regular security updates

## 🎯 Performance Tips

1. **CloudFront Caching for Static Assets**:
   - Create cache behavior for `/_nuxt/*`
   - Cache Policy: CachingOptimized
   - TTL: 1 year

2. **Database Connection Pooling**:
   - Already configured in Prisma
   - Monitor connection count in RDS

3. **EC2 Instance Sizing**:
   - Start with t3.small
   - Monitor CPU/memory usage
   - Scale up if needed

## 📝 Quick Commands

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# View all logs
docker compose -f docker-compose.prod.yml logs -f

# Update application
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Database migration
docker exec blog-mine-backend npx prisma migrate deploy

# Check container status
docker ps
```

---

**Configuration verified for**: `blogmine.ai.kr`
**Last updated**: 2025-01-19
