# Railway Deployment Guide

## ✅ Deployment Status

**Latest Commit:** Pushed to `main` branch  
**Railway:** Auto-deployment triggered  
**Dockerfile:** ✅ Created at root level  
**Configuration:** ✅ `railway.json` configured

---

## 🚀 Deployment Steps

### 1. Push to GitHub (✅ DONE)
```bash
git add Dockerfile .dockerignore railway.json
git commit -m "feat: Add Railway deployment config"
git push origin main
```

### 2. Configure Railway Environment Variables

Go to your Railway project settings and add these environment variables:

#### **Required - Algorand Configuration:**
```bash
ALGORAND_NODE_URL=https://testnet-api.algonode.cloud
ALGORAND_ALGOD_URL=https://testnet-api.algonode.cloud
ALGORAND_ALGOD_TOKEN=
ALGORAND_ALGOD_PORT=443
ALGORAND_INDEXER_URL=https://testnet-idx.algonode.cloud
ALGORAND_APP_ID=758634127
SOLVENT_REGISTRY_APP_ID=758634127
ALGO_MNEMONIC=fit able fancy intact twist together wear weather vapor party bunker cliff custom zero apple plate mobile little term figure rent vacant fatal absent skate
ALGORAND_ADAPTER_ENABLED=true
ENTITY_ID=compliledger-entity-01
```

#### **Required - Backend Configuration:**
```bash
NODE_ENV=production
PORT=3001
API_PORT=3001
```

#### **Optional - Ethereum (Legacy):**
```bash
PRIVATE_KEY=
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

#### **Optional - Yellow Network:**
```bash
YELLOW_API_URL=https://api.yellow.org
YELLOW_API_KEY=
```

### 3. Monitor Deployment

Railway will automatically:
1. Detect the Dockerfile
2. Build the Docker image
3. Deploy the container
4. Run health checks on `/health`

**Health Check Endpoint:** `https://your-app.up.railway.app/health`

---

## 📋 Deployment Checklist

- [x] Root-level `Dockerfile` created
- [x] `.dockerignore` configured
- [x] `railway.json` configured
- [x] Code pushed to GitHub
- [ ] Environment variables configured in Railway
- [ ] Deployment successful
- [ ] Health check passing
- [ ] API endpoints accessible

---

## 🔍 Verify Deployment

### 1. Check Health Endpoint
```bash
curl https://your-app.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-12T...",
  "uptime": 123.45
}
```

### 2. Test API Endpoints

#### Get Liabilities
```bash
curl https://your-app.up.railway.app/api/liabilities
```

#### Get Reserves
```bash
curl https://your-app.up.railway.app/api/reserves
```

#### Get Epoch State (Algorand)
```bash
curl https://your-app.up.railway.app/api/epoch/latest?entity_id=compliledger-entity-01
```

#### Get Health Status (Algorand)
```bash
curl https://your-app.up.railway.app/api/epoch/health?entity_id=compliledger-entity-01
```

---

## 🐛 Troubleshooting

### Build Fails: "Circuit artifacts not found"
**Issue:** ZK circuit files missing  
**Solution:** Circuit artifacts are included in the repo at `backend/circuits/build/`. Ensure they're not gitignored.

### Health Check Fails
**Issue:** App not responding on `/health`  
**Solution:**
1. Check Railway logs for errors
2. Verify `PORT` environment variable is set to `3001`
3. Ensure the app is binding to `0.0.0.0` not `localhost`

### Algorand Integration Not Working
**Issue:** `ALGORAND_APP_ID` not set or adapter disabled  
**Solution:**
1. Verify all Algorand environment variables are set in Railway
2. Check `ALGORAND_ADAPTER_ENABLED=true`
3. Verify `ALGO_MNEMONIC` is correct (25 words)

### Database/File Persistence Issues
**Issue:** Data lost on restart  
**Solution:** Railway ephemeral storage - data is lost on redeploy. For persistence:
- Use Railway volumes (if available)
- Use external database (PostgreSQL, MongoDB)
- Store data in Algorand boxes (on-chain)

---

## 📊 Monitoring

### Railway Dashboard
- **Build Logs:** Check for compilation errors
- **Deploy Logs:** Check for runtime errors
- **Metrics:** CPU, Memory, Network usage

### Application Logs
```bash
# View recent logs in Railway dashboard
# Or use Railway CLI:
railway logs
```

### Health Monitoring
Set up external monitoring (UptimeRobot, Pingdom) to ping:
```
https://your-app.up.railway.app/health
```

---

## 🔐 Security Notes

- ⚠️ **Never commit `.env` to git** (already in `.gitignore`)
- ⚠️ **Rotate `ALGO_MNEMONIC` for production** (current is testnet only)
- ⚠️ **Use Railway secrets** for sensitive environment variables
- ⚠️ **Enable HTTPS** (Railway provides this automatically)
- ⚠️ **Set CORS properly** for production frontend domain

---

## 🔄 Redeployment

Railway auto-deploys on every push to `main`. To manually redeploy:

1. **Via Railway Dashboard:** Click "Deploy" button
2. **Via CLI:**
   ```bash
   railway up
   ```
3. **Via Git:**
   ```bash
   git commit --allow-empty -m "trigger redeploy"
   git push origin main
   ```

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Algorand Developer Portal](https://developer.algorand.org/)

---

## ✅ Next Steps After Successful Deployment

1. **Test all API endpoints** using the verification commands above
2. **Submit first epoch** to Algorand via the deployed API
3. **Connect frontend** to the Railway backend URL
4. **Set up monitoring** and alerts
5. **Configure custom domain** (optional)
6. **Enable auto-scaling** if needed

---

**Deployment initiated!** 🚀

Check Railway dashboard for build progress and logs.
