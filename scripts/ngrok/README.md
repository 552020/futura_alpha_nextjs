# ngrok Development Setup

This directory contains scripts and configuration for setting up ngrok tunnels to enable external service callbacks during development.

## Problem Solved

When developing with external services that need to call back to your application (webhooks, OAuth callbacks, file upload completion notifications), localhost URLs are not accessible from the internet. This creates a development bottleneck where you can't test integrations that require public URLs.

**Example:** Vercel Blob's `onUploadCompleted` callback cannot reach `http://localhost:3000`, but it can reach `https://your-domain.ngrok-free.app`.

## Quick Start

### Option 1: Use Shared Domain (Immediate)

```bash
# Quick setup using Stefano's shared ngrok domain
npm run setup-ngrok
npm run dev:with-ngrok
```

This uses the shared domain: `https://theological-damion-unpatronizing.ngrok-free.app`

### Option 2: Individual Setup (Recommended for Teams)

```bash
# 1. Get your own ngrok domain
ngrok http 3000
# Copy the https:// domain from the output

# 2. Set your custom domain
export NEXT_PUBLIC_NGROK_URL=https://your-domain.ngrok-free.app

# 3. Run setup (will use your custom domain)
npm run setup-ngrok
npm run dev:with-ngrok
```

## Available Scripts

| Script                   | Purpose                         | Usage                           |
| ------------------------ | ------------------------------- | ------------------------------- |
| `npm run setup-ngrok`    | Configure environment variables | Run once to set up `.env.local` |
| `npm run dev:ngrok`      | Start ngrok tunnel only         | For manual ngrok management     |
| `npm run dev:with-ngrok` | Start both Next.js and ngrok    | Main development command        |

## Files in This Directory

### Scripts

- **`setup-dev-ngrok.js`** - Main setup script with comprehensive guidance

### Configuration

- **`ngrok.config.js`** - ngrok configuration file
- **`README.md`** - This documentation

## Environment Variables

The setup creates these environment variables in `.env.local`:

```bash
# ngrok configuration for development
NEXT_PUBLIC_NGROK_URL=https://your-domain.ngrok-free.app

# Development mode flag
NODE_ENV=development
```

## Individual Developer Setup

### 1. Sign up for ngrok

- Go to [https://ngrok.com](https://ngrok.com)
- Create a free account
- Get your authtoken from the dashboard

### 2. Configure ngrok

```bash
ngrok config add-authtoken <your-authtoken>
```

### 3. Get your own domain

```bash
# Option A: Use a static domain (if you have a paid plan)
ngrok http --url=your-custom-domain.ngrok-free.app 3000

# Option B: Use ephemeral domains (free)
ngrok http 3000
```

### 4. Set your environment

```bash
# If using static domain
export NEXT_PUBLIC_NGROK_URL=https://your-custom-domain.ngrok-free.app

# If using ephemeral domain, get the URL from ngrok output
export NEXT_PUBLIC_NGROK_URL=https://abc123.ngrok-free.app
```

### 5. Run setup

```bash
npm run setup-ngrok
npm run dev:with-ngrok
```

## Team Development

### For Multiple Developers

**Problem:** Only one developer can use the shared domain at a time.

**Solution:** Each developer should get their own ngrok account and domain.

### Workflow for New Team Members

```bash
# 1. Clone the repo
git clone <repo>
cd futura_alpha_icp/src/nextjs

# 2. Get their own ngrok domain
ngrok http 3000
# Copy the https:// domain from output

# 3. Set environment variable
export NEXT_PUBLIC_NGROK_URL=https://their-domain.ngrok-free.app

# 4. Run setup (automatically uses their domain)
npm run setup-ngrok
npm run dev:with-ngrok
```

## Use Cases Enabled

This setup enables:

- ✅ **Webhook testing** - External services can call your API
- ✅ **OAuth callbacks** - Social login redirects work in development
- ✅ **File upload callbacks** - Services like Vercel Blob can notify your app
- ✅ **External API testing** - Test integrations that require public URLs
- ✅ **Payment processing** - Payment gateway callbacks
- ✅ **Third-party services** - Any service needing to call back to your app

## Troubleshooting

### Multiple Developers

- **Problem**: Only one developer can use the shared domain at a time
- **Solution**: Each developer should get their own ngrok account and domain

### ngrok Warning Page

- **Problem**: Seeing ngrok warning page instead of your app
- **Solution**: Make sure your Next.js app is running on port 3000 first

### Webhook/Callback Issues

- **Problem**: External services can't reach your localhost
- **Solution**: Use the ngrok public URL instead of localhost

### Environment Variable Not Working

- **Problem**: Scripts not using your custom domain
- **Solution**: Make sure `NEXT_PUBLIC_NGROK_URL` is set before running setup scripts

```bash
# Check if your environment variable is set
echo $NEXT_PUBLIC_NGROK_URL

# If not set, set it and run setup again
export NEXT_PUBLIC_NGROK_URL=https://your-domain.ngrok-free.app
npm run setup-uploadthing
```

## Technical Details

### How It Works

1. **ngrok creates a tunnel** from a public URL to your localhost
2. **External services** can reach your app via the public URL
3. **Callbacks and webhooks** work as if your app was deployed
4. **Development continues** on localhost with full external integration

### URL Structure

```
External Service → https://your-domain.ngrok-free.app/api/endpoint
                ↓
ngrok tunnel → http://localhost:3000/api/endpoint
```

### Configuration Files

- **`.env.local`** - Generated by setup scripts with your ngrok URL
- **`ngrok.config.js`** - Static configuration for the shared domain
- **`package.json`** - Scripts for running ngrok with Next.js

## Security Considerations

### Development Only

- This setup is **only for development**
- Never use ngrok URLs in production
- The public URLs are accessible to anyone who knows them

### Best Practices

- Use individual domains for team development
- Don't commit ngrok URLs to version control
- Use environment variables for configuration
- Consider upgrading to ngrok paid plan for team features

## Future Improvements

### Potential Enhancements

- Add conflict detection for shared domain usage
- Implement automatic tunnel health checks
- Add CI/CD integration for testing with ngrok
- Create environment-specific configurations

### Scaling Considerations

- Consider upgrading to ngrok paid plan for team features
- Implement domain rotation for multiple developers
- Add monitoring for ngrok tunnel health
- Consider implementing webhook signature verification

## Support

### Getting Help

- Check the [ngrok documentation](https://ngrok.com/docs)
- Review the troubleshooting section above
- Check the main project documentation
- Contact the development team

### Common Issues

1. **"ngrok not found"** - Install ngrok: `npm install -g ngrok`
2. **"Tunnel not working"** - Check if Next.js is running on port 3000
3. **"Environment variable not set"** - Run setup scripts again
4. **"Multiple developers conflict"** - Each developer needs their own domain

## Related Documentation

- [Main ngrok Integration Documentation](../../../docs/ngrok-integration-implementation.md)
- [Vercel Blob Localhost Issue](../../../issues/vercel-blob-onuploadcompleted-localhost-issue.md)
- [UploadThing Analysis](../../../docs/uploadthing-large-files-localhost.md)
