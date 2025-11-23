# How to Deploy to Vercel (Frontend + Backend)

This guide explains how to deploy the **Entire Application** (both Frontend and Backend) to Vercel as a single project.

**You do NOT need to deploy the backend separately.**
This project uses a "Monorepo" setup where Vercel serves the HTML files statically *and* runs the Node.js backend as Serverless Functions.

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
    *   **Framework Preset**: Select **"Other"** (Vercel will auto-detect the settings).
    *   **Root Directory**: Leave as `./` (the default).
    *   **Build Command**: Leave empty.
    *   **Output Directory**: Leave empty.

3.  **Set Environment Variables** (Crucial)
    Expand the **"Environment Variables"** section. You **must** add the following variables for the backend to work.

    *Note: These variables are for the Backend, which runs secretly on Vercel's servers.*

    | Key | Value Description |
    | --- | --- |
    | `MONGO_URI` | Your MongoDB connection string (e.g., `mongodb+srv://user:pass@cluster...`). |
    | `JWT_SECRET` | A long, random string used to sign authentication tokens. |
    | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary Cloud Name. |
    | `CLOUDINARY_API_KEY` | Your Cloudinary API Key. |
    | `CLOUDINARY_API_SECRET` | Your Cloudinary API Secret. |
    | `CLIENT_URL` | (Optional) The URL of your deployed site (e.g., `https://my-app.vercel.app`). |

    **About `CLIENT_URL`**:
    *   Since the Frontend and Backend are on the same domain, strictly speaking, you don't need complex Cross-Origin Resource Sharing (CORS) setup.
    *   However, setting `CLIENT_URL` to your live Vercel URL (e.g., `https://uc-central.vercel.app`) is good practice to prevent other sites from using your API.
    *   If you leave it blank, the code is configured to allow `*` (all origins) temporarily.

4.  **Deploy**
    *   Click **"Deploy"**.
    *   Vercel will build the project. It looks at `vercel.json` and `backend/server.js` and automatically configures the backend.

## Verification

Once deployment is complete:

1.  **Frontend**: Click the screenshot or URL provided by Vercel. The Login page should appear.
2.  **Backend**: Add `/api` to the end of your URL (e.g., `https://your-project.vercel.app/api`).
    *   You should see the text: `"UC-Central Backend is running (API)"`.
    *   If you see a 404 or 500 error, check the **Logs** tab in Vercel. It usually means the `MONGO_URI` is missing or incorrect.

## How It Works (Under the Hood)

*   **Frontend**: Vercel serves all files in the root (`index.html`, `pages/`, `assets/`) as a standard static website.
*   **Backend**: The `vercel.json` file contains a "rewrite" rule:
    ```json
    { "source": "/api/:match*", "destination": "/backend/server.js" }
    ```
    This tells Vercel: "Any request starting with `/api` should be handled by the Node.js application in `backend/server.js`."
*   **Communication**: The frontend's `api.js` file automatically detects it is running on the web (not localhost) and sends requests to `/api/...`, which Vercel routes to your backend.
