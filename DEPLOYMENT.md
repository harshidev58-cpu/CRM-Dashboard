# Production Deployment Guide: Civic Shield Reality Layer

Follow these instructions to deploy the **Civic Shield Reality Layer** MVP to production.

---

## Prerequisites
Ensure you have the following accounts and credentials ready:
1. **GitHub/GitLab** repository for version control.
2. **MongoDB Atlas** account for hosting the database.
3. **Vercel** account for hosting the Next.js application.
4. **Google Gemini API Key** (from Google AI Studio).

---

## Phase 1: MongoDB Atlas Configuration

1. **Create a Database Cluster:**
   - Sign in to MongoDB Atlas and create a new shared cluster (e.g. `M0 Sandbox`).
   - Select your preferred Cloud Provider and Region (e.g., AWS / Mumbai or US East).

2. **Configure Database Access:**
   - Go to **Database Access** -> **Add New Database User**.
   - Set Authentication Method to **Password**.
   - Save the username and password securely. Set the role to **Read and write to any database**.

3. **Configure Network Access:**
   - Go to **Network Access** -> **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`) since Vercel's serverless functions use dynamic IP addresses. Click **Confirm**.

4. **Retrieve Connection String:**
   - Go to the Cluster view and click **Connect**.
   - Select **Drivers** (Node.js).
   - Copy the Connection String (looks like `mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`).
   - Replace `<username>` and `<password>` with your created database credentials.

---

## Phase 2: Local Verification

1. **Configure local environment variables:** Create a `.env.local` file at the root of your project:
   ```env
   MONGODB_URI=mongodb://localhost:27017/civicshield
   NEXTAUTH_URL=http://localhost:3000
   GEMINI_API_KEY=AIzaSyYourActualKeyFromAIStudio
   
   # Seeder Secret (Option A)
   SEED_SECRET=testsecret
   
   # Generate a strong key (e.g. openssl rand -base64 32)
   NEXTAUTH_SECRET=QjP1Vw4R6M...
   ```

2. **Verify build and run locally in production mode:**
   Run the following commands to build the static pages and start the production server locally to catch deployment-only bugs:
   ```bash
   # Build the optimized production bundle
   npm run build
   
   # Start the production server locally
   npm run start
   ```

3. **Seed database locally:** Visit `http://localhost:3000/api/seed?secret=testsecret` in your browser. This resets and populates the departments, officers, and initial complaints.

---

## Phase 3: Deployment to Vercel

1. **Push Code to Repository:**
   - Initialize git and push your code to your private GitHub repository:
     ```bash
     git init
     git add .
     git commit -m "feat: production ready deployment"
     git branch -M main
     git remote add origin <your-repo-url>
     git push -u origin main
     ```

2. **Import Project to Vercel:**
   - Open the Vercel Dashboard and click **Add New** -> **Project**.
   - Import your GitHub repository.

3. **Configure Environment Variables:**
   - Add the following variables under Vercel's Environment Variables panel:
     - `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster.mongodb.net/civicshield-prod?retryWrites=true&w=majority` (Note the dedicated production database `civicshield-prod` database suffix).
     - `NEXTAUTH_SECRET` = A strong secret (e.g., generate via `openssl rand -base64 32`).
     - `NEXTAUTH_URL` = `https://<your-vercel-domain>.vercel.app` (Vercel deployment URL).
     - `GEMINI_API_KEY` = `AIzaSy...` (Your Gemini API Key).
     - `SEED_SECRET` = A strong custom seed token (e.g. `hackathon-2026-secret-seed-key`).

4. **Deploy:**
   - Click **Deploy**. Vercel will build and launch your application.
   - Once deployed, trigger database initialization by visiting:
     `https://<your-vercel-domain>.vercel.app/api/seed?secret=<SEED_SECRET>`

---

## Scalability and Future Integrations

- **New Departments & Categories:** To add new departments or categories, simply insert them into the `Department` model or update the Gemini API prompt inside `/lib/gemini.ts`.
- **MCD311 / external integrations:** Add custom background webhooks under `/api/ingestion` to call the service layers:
  ```typescript
  // Example integration hook
  const rawComplaint = await fetch('https://api.mcd311.gov.in/tickets');
  const cleanCategory = await classifyComplaint(rawComplaint.title, rawComplaint.description);
  // Create complaint and trigger RealityEngine
  ```
- **Social Media ingestion:** Use the embedding services inside `SimilarityService` to evaluate social posts against existing complaints.
