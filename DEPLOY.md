# How to Deploy to Vercel

This project is configured to be deployed on Vercel as a monorepo, combining the static HTML/JS Frontend and the Node.js/Express Backend (running as a Serverless Function).

## Prerequisites

1.  A [Vercel](https://vercel.com) account.
2.  A [MongoDB Atlas](https://www.mongodb.com/atlas) database (Connection String).
3.  A [Cloudinary](https://cloudinary.com) account (for image uploads).
4.  This code pushed to a Git provider (GitHub, GitLab, or Bitbucket).

## Step-by-Step Deployment

1.  **Import Project**
    *   Log in to your Vercel Dashboard.
    *   Click **"Add New..."** > **"Project"**.
    *   Select your Git repository and click **"Import"**.

2.  **Configure Project Settings**
    *   **Framework Preset**: Select **"Other"** (or leave as default if Vercel detects it).
    *   **Root Directory**: Leave as `./` (the root of the repo).
    *   **Build Command**: You can leave this empty.
    *   **Output Directory**: You can leave this empty.

3.  **Set Environment Variables** (Crucial)
    Expand the **"Environment Variables"** section. You **must** add the following variables for the backend to work:

    | Key | Value Description |
    | --- | --- |
    | `MONGO_URI` | Your MongoDB connection string (e.g., `mongodb+srv://user:pass@cluster...`). |
    | `JWT_SECRET` | A long, random string used to sign authentication tokens. |
    | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary Cloud Name. |
    | `CLOUDINARY_API_KEY` | Your Cloudinary API Key. |
    | `CLOUDINARY_API_SECRET` | Your Cloudinary API Secret. |
    | `CLIENT_URL` | (Optional) The URL of your Vercel deployment (e.g., `https://my-app.vercel.app`). Used for CORS. |

    *Note: If you don't set `CLIENT_URL`, the backend is configured to allow all origins (`*`) temporarily.*

4.  **Deploy**
    *   Click **"Deploy"**.
    *   Vercel will build the project. It will install dependencies for `backend/` automatically when it detects the serverless function usage.

## Verification

1.  **Frontend**: Open the deployed URL. You should see the Login or Dashboard page.
2.  **Backend**: Append `/api` to your URL (e.g., `https://my-app.vercel.app/api`). You should see the message: `"UC-Central Backend is running (API)"`.
3.  **Test**: Try logging in. If it fails, check the **Logs** tab in the Vercel Dashboard. It usually means `MONGO_URI` is incorrect or the database is unreachable.

## Technical Details

*   **`vercel.json`**: Configures the routing. It rewrites any request starting with `/api/` to the `backend/server.js` file.
*   **`backend/server.js`**: Modified to export the Express app (required for Vercel Serverless) and cache the MongoDB connection.
*   **`assets/js/api.js`**: Automatically switches the API base URL.
    *   **Localhost**: Uses `http://localhost:5000`.
    *   **Production (Vercel)**: Uses `/api` (relative path).
