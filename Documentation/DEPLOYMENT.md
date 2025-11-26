# Deployment Guide

This guide walks you through deploying your SaaS Starter Kit to production.

## Prerequisites

- [ ] Supabase project set up and migrations run
- [ ] Environment variables documented
- [ ] Code tested locally
- [ ] Git repository created

## Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend) - Recommended

#### Deploy Backend to Railway

1. **Create Railway Account**: https://railway.app
2. **Create New Project**: Click "New Project"
3. **Deploy from GitHub**:
   - Connect your GitHub repository
   - Select the backend folder
4. **Configure Environment Variables**:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   ENVIRONMENT=production
   LOG_LEVEL=INFO
   ALLOWED_ORIGINS=["https://your-frontend-domain.com"]
   ```
5. **Set Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Note the URL**: e.g., `https://your-app.railway.app`

#### Deploy Frontend to Vercel

1. **Create Vercel Account**: https://vercel.com
2. **Import Project**: 
   - Click "New Project"
   - Import from GitHub
   - Select frontend folder as root directory
3. **Configure Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
4. **Deploy**: Vercel will automatically build and deploy
5. **Custom Domain** (optional): Add in project settings

### Option 2: Render (Full Stack)

#### Deploy Backend
1. Go to https://render.com
2. Create "New Web Service"
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Add all backend env variables
5. Deploy

#### Deploy Frontend
1. Create "New Static Site"
2. Connect GitHub repository
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `out`
   - **Environment**: Add all frontend env variables
4. Add `output: 'export'` to `next.config.js`
5. Deploy

### Option 3: Docker + DigitalOcean/AWS

#### 1. Build Docker Images

**Backend:**
```bash
cd backend
docker build -t your-username/saas-backend:latest .
docker push your-username/saas-backend:latest
```

**Frontend (create Dockerfile):**
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm install --production

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
cd frontend
docker build -t your-username/saas-frontend:latest .
docker push your-username/saas-frontend:latest
```

#### 2. Deploy to DigitalOcean App Platform

1. Create new app
2. Add both containers
3. Configure environment variables
4. Set up domain
5. Deploy

## Production Checklist

### Security
- [ ] Use HTTPS everywhere
- [ ] Rotate JWT secrets regularly
- [ ] Set up CORS properly
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Use environment variables (never hardcode)
- [ ] Enable Supabase RLS policies
- [ ] Review and minimize permissions

### Performance
- [ ] Enable caching
- [ ] Set up CDN (Cloudflare)
- [ ] Optimize images
- [ ] Enable gzip compression
- [ ] Monitor API response times
- [ ] Set up database indexes
- [ ] Configure connection pooling

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Set up logging (Datadog, LogRocket)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Configure alerts
- [ ] Set up analytics (Posthog, Google Analytics)

### Backups
- [ ] Enable Supabase automatic backups
- [ ] Set up database backup schedule
- [ ] Test backup restoration
- [ ] Document backup procedures

### Documentation
- [ ] Update README with production URLs
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Document environment variables

## Environment Variables by Service

### Supabase (Already Configured)
- Project URL
- Anon Key
- Service Role Key
- JWT Secret

### Backend Production Environment
```env
ENVIRONMENT=production
LOG_LEVEL=INFO
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=["https://your-domain.com"]
```

### Frontend Production Environment
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_APP_NAME=Your App Name
```

## Domain Setup

### Custom Domain for Frontend
1. Purchase domain (Namecheap, GoDaddy, etc.)
2. Add DNS records in Vercel/your host:
   ```
   Type: A
   Name: @
   Value: [provided by host]
   
   Type: CNAME
   Name: www
   Value: [provided by host]
   ```
3. Wait for DNS propagation (up to 48 hours)

### SSL Certificates
- Most platforms (Vercel, Railway, Render) provide automatic SSL
- For custom setups, use Let's Encrypt

## Post-Deployment

### 1. Smoke Testing
```bash
# Test backend health
curl https://your-backend.com/health

# Test frontend
curl https://your-frontend.com

# Test authentication
# Sign up a test user
# Assign admin role
# Test admin panel access
```

### 2. Create First Admin User
```sql
-- In Supabase SQL Editor
-- Find the user
SELECT id FROM profiles WHERE email = 'admin@yourcompany.com';

-- Assign Admin role
INSERT INTO user_roles (user_id, role_id)
VALUES ('user-id-from-above', 1);
```

### 3. Set Up Monitoring
- Configure uptime monitoring
- Set up error alerts
- Monitor API performance
- Track user analytics

### 4. Documentation
- Document production URLs
- Create admin user guide
- Document maintenance procedures

## Scaling Strategy

### When to Scale

**Frontend:**
- High traffic (Vercel auto-scales)
- Geographic distribution (use CDN)

**Backend:**
- CPU > 70% consistently
- Response time > 200ms
- Memory usage > 80%

**Database:**
- Connection pool exhausted
- Query time increasing
- Storage > 80%

### How to Scale

**Horizontal (Add more servers):**
- Deploy multiple backend instances
- Use load balancer
- Supabase handles database scaling

**Vertical (Bigger servers):**
- Upgrade server tier
- Increase memory/CPU
- Upgrade Supabase plan

## Troubleshooting Production Issues

### Backend Not Responding
1. Check logs in hosting platform
2. Verify environment variables
3. Check database connection
4. Review Supabase status

### Frontend Errors
1. Check browser console
2. Review build logs
3. Verify API URL is correct
4. Check CORS settings

### Authentication Issues
1. Verify JWT secret matches
2. Check Supabase settings
3. Review token expiration
4. Check CORS configuration

### Database Errors
1. Check Supabase dashboard
2. Review connection limits
3. Check RLS policies
4. Monitor query performance

## Rollback Procedure

If deployment fails:

### Vercel
1. Go to Deployments
2. Click on previous working deployment
3. Click "Promote to Production"

### Railway
1. Go to Deployments
2. Select previous deployment
3. Click "Redeploy"

### Docker
1. Pull previous image version
2. Stop current containers
3. Start with previous version

## Cost Estimates

### Minimal Setup (Hobby Projects)
- **Supabase Free**: $0/month (up to 500MB, 2 CPU hours)
- **Vercel Hobby**: $0/month
- **Railway Free**: $5 credit/month
- **Total**: ~$0-20/month

### Production Setup (Small Business)
- **Supabase Pro**: $25/month
- **Vercel Pro**: $20/month
- **Railway**: ~$20-50/month
- **Total**: ~$65-95/month

### Growth Setup (Scaling)
- **Supabase Team**: $599/month
- **Vercel Team**: $20/user/month
- **Railway/DigitalOcean**: $100-500/month
- **Total**: ~$700-1100/month

## Support & Maintenance

### Regular Tasks
- **Daily**: Monitor error logs
- **Weekly**: Review performance metrics
- **Monthly**: Security updates, dependency updates
- **Quarterly**: Backup testing, security audit

### Update Strategy
1. Test updates in staging
2. Schedule maintenance window
3. Deploy to production
4. Monitor for issues
5. Rollback if needed

---

## Quick Deploy Commands

### Deploy to Vercel (Frontend)
```bash
cd frontend
npm install -g vercel
vercel
```

### Deploy to Railway (Backend)
```bash
cd backend
railway login
railway init
railway up
```

### Docker Deploy
```bash
# Build
docker-compose build

# Deploy
docker-compose up -d
```

---

**Congratulations on deploying your SaaS application!** 🎉

For help, check:
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Supabase Docs](https://supabase.com/docs)
