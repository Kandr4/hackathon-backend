# Database Configuration Update

## ✅ Changes Made

The backend now uses a **PostgreSQL connection URL** instead of individual connection parameters.

### What Changed

**Before:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=learning_platform
DB_USER=postgres
DB_PASSWORD=your_password
```

**After:**
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/learning_platform
```

### Benefits

✅ **Simpler configuration** - One variable instead of five
✅ **Production-ready** - Most hosting platforms (Heroku, Railway, Render) use DATABASE_URL
✅ **Easier deployment** - Copy-paste connection string from your database provider
✅ **Standard format** - Industry-standard PostgreSQL URL format

## 🔄 Migration Steps

### 1. Update Your .env File

Edit `backend/.env`:

```env
# Remove these old variables:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=learning_platform
# DB_USER=postgres
# DB_PASSWORD=your_password

# Add this instead:
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/learning_platform
```

Replace `your_password` with your actual PostgreSQL password.

### 2. Restart Backend

```powershell
cd backend
npm run dev
```

You should see: `Connected to PostgreSQL database`

## 📝 Connection URL Format

```
postgresql://[username]:[password]@[host]:[port]/[database]
```

Examples:

**Local Development:**
```
postgresql://postgres:mypassword@localhost:5432/learning_platform
```

**Heroku:**
```
postgresql://user:pass@ec2-123-456-789.compute-1.amazonaws.com:5432/dbname
```

**Railway:**
```
postgresql://postgres:pass@containers-us-west-123.railway.app:5432/railway
```

## 🚀 Production Benefits

### Easy Deployment

Most cloud platforms provide a DATABASE_URL automatically:

**Heroku:**
```bash
heroku config:get DATABASE_URL
# Use this value in your .env
```

**Railway:**
- Automatically sets DATABASE_URL
- Just deploy, no configuration needed

**Render:**
```bash
# Copy from Dashboard → Database → Connection String
```

### SSL Support

The updated configuration includes SSL support for production:

```javascript
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
```

This allows secure connections to cloud databases.

## 🧪 Testing

### Verify Connection

```powershell
cd backend
npm run dev
```

Expected output:
```
Connected to PostgreSQL database
Database connection successful
Server is running on port 5000
```

### Test API

```powershell
curl http://localhost:5000/health
```

Should return:
```json
{"status":"ok","message":"Server is running"}
```

## ❓ Troubleshooting

### Error: "Invalid connection string"

**Check format:**
```
postgresql://username:password@host:port/database
```

Make sure there are no spaces and the format is correct.

### Error: "password authentication failed"

**Solution:**
- Check your PostgreSQL password is correct
- URL-encode special characters in password:
  - `@` becomes `%40`
  - `#` becomes `%23`
  - `/` becomes `%2F`

Example:
```
# If password is: pass@123
DATABASE_URL=postgresql://postgres:pass%40123@localhost:5432/learning_platform
```

### Error: "database does not exist"

**Solution:**
```powershell
createdb -U postgres learning_platform
cd backend
npm run init-db
```

## 📚 Additional Notes

### Backward Compatibility

The old individual parameters still work as fallback if DATABASE_URL is not set. However, DATABASE_URL takes priority.

### Environment-Specific URLs

You can have different URLs for different environments:

**.env.development:**
```env
DATABASE_URL=postgresql://postgres:dev@localhost:5432/learning_platform_dev
```

**.env.production:**
```env
DATABASE_URL=postgresql://user:pass@production-host:5432/prod_db
```

### Security

- Never commit `.env` files to git
- `.env` is in `.gitignore`
- Use `.env.example` as template
- Store production DATABASE_URL in your hosting platform's environment variables

## ✨ Summary

✅ Single environment variable for database connection
✅ Works with all major cloud platforms
✅ Supports SSL for production databases
✅ Easier to configure and deploy
✅ Industry standard format

Your backend is now ready for both local development and production deployment!
