# Deployment Guide: UC-Central

This guide explains how to deploy the UC-Central application (React Frontend + Node.js Backend) to Vercel.

## Architecture
- **Frontend:** React (`client/`)
- **Backend:** Node.js/Express Serverless (`backend/`)
- **Configuration:** `vercel.json` handles the build and routing for both.

## Prerequisites
1.  **Vercel Account:** [Sign up here](https://vercel.com/).
2.  **GitHub Repository:** Push this code to a GitHub repository.
3.  **MongoDB Atlas:** A running MongoDB instance.
4.  **Cloudinary:** Account for image hosting.

## Deployment Steps

### 1. Push to GitHub
Ensure your project is pushed to your GitHub repository.

### 2. Import Project to Vercel
1.  Go to your Vercel Dashboard.
2.  Click **"Add New..."** -> **"Project"**.
3.  Import your GitHub repository.
4.  **Root Directory:** Leave this as `./` (the default). **Do not** change it to `client` or `backend`. Vercel needs to see `vercel.json` in the root.

### 3. Configure Environment Variables
In the "Environment Variables" section of the deployment screen, add the following keys. These are required for the backend to function.

| Variable Key | Description |
| :--- | :--- |
| `MONGO_URI` | Your MongoDB connection string (e.g., `mongodb+srv://...`). |
| `ACCESS_TOKEN_SECRET` | A secret string for signing JSON Web Tokens (e.g., `mySuperSecretKey`). |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary Cloud Name. |
| `CLOUDINARY_API_KEY` | Your Cloudinary API Key. |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API Secret. |

*(Note: `PORT` is automatically handled by Vercel).*

### 4. Deploy
Click **"Deploy"**.

Vercel will detect the configuration in `vercel.json`:
- It will build the backend as a Serverless Function (`@vercel/node`).
- It will build the React frontend (`@vercel/static-build`).
- It will route `/api/*` requests to the backend and all other requests to the frontend.

### 5. Verify
Once deployed, open your Vercel URL (e.g., `https://uc-central.vercel.app`).
- Navigate around the site to verify the frontend.
- Try logging in to verify backend connectivity.

## Troubleshooting
- **Backend 404s:** Ensure your environment variables are correct. Check the Vercel Function Logs for connection errors.
- **Frontend Build Fails:** Check the Build Logs. Ensure dependencies in `client/package.json` are correct.
