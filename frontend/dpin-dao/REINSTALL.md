# Fix Instructions

The error is caused by:
1. Missing @onflow/react-sdk package
2. React 19 incompatibility (SDK expects React 18)

## To fix:

```bash
cd frontend/dpin-dao
rm -rf node_modules package-lock.json
npm install
npm run dev
```

This will:
- Install @onflow/react-sdk
- Downgrade React to 18.2.0 (compatible version)
- Reinstall all dependencies with correct versions
