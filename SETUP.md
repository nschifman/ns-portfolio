# Setup Guide

## Environment Variables

To use this website, you need to configure the following environment variables in your Cloudflare Pages deployment:

### Required Variables

1. **R2_ACCOUNT_ID**
   - Your Cloudflare R2 Account ID
   - Found in your Cloudflare dashboard under R2

2. **R2_ACCESS_KEY_ID**
   - Your R2 Access Key ID
   - Create this in your Cloudflare R2 dashboard

3. **R2_SECRET_ACCESS_KEY**
   - Your R2 Secret Access Key
   - Create this in your Cloudflare R2 dashboard

### Optional Variables

4. **R2_BUCKET_NAME**
   - Your R2 bucket name
   - Default: `ns-portfolio-photos`

5. **R2_BUCKET_URL**
   - Your R2 bucket URL
   - Default: `https://photos.noahschifman.com`

## Setting Up Cloudflare Pages

1. Go to your Cloudflare dashboard
2. Navigate to Pages
3. Create a new project or connect your repository
4. In the project settings, go to "Environment variables"
5. Add each variable listed above
6. Deploy your project

## R2 Bucket Setup

1. Create a new R2 bucket in your Cloudflare dashboard
2. Upload your photos organized by category folders
3. Make sure the bucket is publicly accessible
4. Note your bucket name and URL

## Testing Locally

To test locally, you can create a `.env` file in the root directory with the same variables, but the API functions will only work when deployed to Cloudflare Pages.

## Security Notes

- Never commit your actual R2 credentials to version control
- Use environment variables for all sensitive information
- The API functions will throw an error if credentials are missing 