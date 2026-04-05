# Jenkins Setup Guide for SnapSure

Complete step-by-step guide to implement Jenkins CI/CD pipeline from scratch.

## Prerequisites

- **Operating System**: Windows/Mac/Linux
- **Java**: JDK 11 or later (Jenkins requires Java)
- **Docker**: For containerized deployment (optional but recommended)
- **Git**: For repository access
- **GitHub/GitLab/Bitbucket**: Repository hosting

---

## Part 1: Install Jenkins

### Option 1: Jenkins on Windows

**Step 1: Install JDK**
```powershell
# Download and install from https://adoptium.net/ (Eclipse Temurin)
# Or use Windows Package Manager
choco install openjdk11 -y

# Verify
java -version
```

**Step 2: Download & Install Jenkins**
```powershell
# Download from https://www.jenkins.io/download/
# Windows Installer: jenkins.msi

# Run installer, follow wizard:
# - Choose "Run as Local System" or with a user account
# - Default port: 8080
# - Choose "Install as Windows Service"
```

**Step 3: Access Jenkins**
Open browser: `http://localhost:8080`

Look for initial admin password:
- Windows: `C:\Program Files\Jenkins\secrets\initialAdminPassword`
- Or: Jenkins Console Output window

---

### Option 2: Jenkins in Docker (Faster)

```powershell
# Create persistent volume for Jenkins data
docker volume create jenkins_home

# Run Jenkins container
docker run -d `
  --name jenkins `
  -p 8080:8080 `
  -p 50000:50000 `
  -v jenkins_home:/var/jenkins_home `
  -v /var/run/docker.sock:/var/run/docker.sock `
  jenkins/jenkins:latest

# Get initial admin password
docker logs jenkins

# Access at: http://localhost:8080
```

---

## Part 2: Initial Jenkins Setup

1. **Unlock Jenkins**
   - Paste the initial admin password
   - Click "Continue"

2. **Install Suggested Plugins**
   - Click "Install suggested plugins"
   - Wait for installation (~5 minutes)

3. **Create Admin User**
   - Username: `admin`
   - Password: Strong password
   - Full name: Your name
   - Email: your-email@example.com

4. **Configure Jenkins URL**
   - Jenkins URL: `http://localhost:8080/` (or your server IP)
   - Save and finish

---

## Part 3: Install Required Plugins

In Jenkins UI:

1. Go to **Manage Jenkins** > **Manage Plugins**
2. Search for & install these:

| Plugin | Purpose |
|--------|---------|
| **Git** | Clone/pull from Git repositories |
| **GitHub** (or GitLab) | GitHub/GitLab integration |
| **Docker** | Build and push Docker images |
| **Pipeline** | Declarative/scripted pipelines |
| **Blue Ocean** | Modern pipeline UI (optional but beautif ul) |
| **Email Extension** | Send build notifications |
| **AnsiColor** | Colored console output |

**Installation steps:**
1. Available Plugins tab
2. Search for plugin name
3. Check checkbox
4. Click "Install without restart"
5. Restart Jenkins after all installs

---

## Part 4: Setup Git Repository Connection

### Add GitHub Credentials

1. Go to **Manage Jenkins** > **Manage Credentials**
2. Click **System** > **Global credentials**
3. Click **+ Add Credentials**
4. Choose type: **Username and password** (or SSH key for advanced)
5. Enter:
   - Username: `your-github-username`
   - Password: Personal Access Token (from GitHub)
   - ID: `github-credentials`
6. Click Create

**To get GitHub Personal Access Token:**
- Go to GitHub > Settings > Developer settings > Personal access tokens
- Click "Generate new token"
- Select scopes: `repo`, `admin:repo_hook`
- Copy token and use as password in Jenkins

### Add Docker Registry Credentials

1. Same steps as above
2. Choose type: **Username and password**
3. Enter:
   - Username: `your-docker-username`
   - Password: Docker Hub password (or personal access token)
   - ID: `docker-credentials`

---

## Part 5: Create a New Pipeline Job

1. Click **New Item**
2. Enter job name: `SnapSure-Pipeline`
3. Select **Pipeline**
4. Click **OK**

### Configure Pipeline

Under **Pipeline** section:
- **Definition**: Pipeline script from SCM
- **SCM**: Git
- **Repository URL**: `https://github.com/YOUR_USERNAME/SnapSure.git`
- **Credentials**: Select `github-credentials`
- **Branch**: `*/main`
- **Script Path**: `Jenkinsfile` (this file is in repo root)

Click **Save**

---

## Part 6: Create Jenkinsfile (Already Done!)

The [Jenkinsfile](../Jenkinsfile) in project root defines all pipeline stages:

```
📋 PIPELINE STAGES:
├─ 🔍 Checkout Code
├─ 🏗️ Build Backend
├─ 🏗️ Build Frontend
├─ 🧪 Unit Tests
├─ 🔐 Security Scan
├─ 🐳 Build Docker Images
├─ 🏷️ Push to Registry
├─ 🚀 Deploy to Staging
├─ 🧬 Smoke Tests
└─ 📊 Generate Report
```

Each stage:
- Shows progress in Jenkins UI
- Prints timestamped logs
- Fails if any command fails (auto-rollback)
- Reports status at end

---

## Part 7: Run Your First Pipeline

### Manually Trigger

1. Go to Jenkins home
2. Find **SnapSure-Pipeline** job
3. Click **Build Now**
4. Watch progress in **Build History** > **Console Output**

### View in Blue Ocean (Beautiful UI)

1. Click **Blue Ocean** in left menu
2. See all pipeline stages with progress bars
3. Click any stage to see logs
4. Green = success, Red = failure

---

## Part 8: Setup GitHub Webhook (Auto-trigger on Push)

### In GitHub

1. Go to your repository
2. Settings > Webhooks > Add webhook
3. Enter:
   - Payload URL: `http://your-jenkins-server:8080/github-webhook/`
   - Content type: `application/json`
   - Events: "Let me select" > Push events
4. Click Add webhook

### In Jenkins

1. Go to SnapSure-Pipeline job
2. Configure > Build Triggers
3. Check: **GitHub hook trigger for GITScm polling**
4. Save

**Now:** Every push to `main` branch automatically triggers pipeline!

---

## Part 9: View Reports & Logs

### Build History

1. Pipeline job > Build History
2. Click a build number to see:
   - Status: ✅ Success or ❌ Failed
   - Duration
   - Console output
   - Build artifacts

### Console Output

Shows real-time logs during build:
```
[Stage: 🔍 Checkout Code] ✅ Passed
[Stage: 🏗️ Build Backend] ✅ Passed in 2m 15s
[Stage: 🧪 Unit Tests] ✅ Passed
...
```

---

## Part 10: Common Configurations

### Email Notifications

Go to **Manage Jenkins** > **Configure System** > **Email Notification**

```
SMTP server: smtp.gmail.com
SMTP port: 465
Use SSL: ✓
Authentication: admin@gmail.com / app-password
```

Then in Jenkinsfile, add:
```groovy
post {
    always {
        emailext(
            subject: "Build ${BUILD_NUMBER}: ${currentBuild.result}",
            body: "Build logs at ${BUILD_URL}",
            to: "your-email@example.com"
        )
    }
}
```

### Slack Notifications

1. Install **Slack Notification** plugin
2. Get Slack Bot Token from your workspace
3. Add to Jenkinsfile:
```groovy
post {
    success {
        slackSend(channel: '#deployments', message: "Build succeeded!")
    }
}
```

### Pipeline Timeout

Add to Jenkinsfile (prevent hanging builds):
```groovy
options {
    timeout(time: 1, unit: 'HOURS')
}
```

---

## Part 11: Production Checklist

- [ ] Jenkins running on persistent server/container
- [ ] Docker credentials configured
- [ ] GitHub credentials configured
- [ ] Webhook configured for auto-trigger
- [ ] Email/Slack notifications enabled
- [ ] Build logs archived
- [ ] Docker images pushed to registry
- [ ] Deployment targets ready (Docker Swarm, Kubernetes, etc.)

---

## Part 12: Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| **Pipeline won't start** | GitHub credentials invalid | Check Manage Credentials > Test connection |
| **Docker build fails** | Docker not accessible | Ensure Docker socket mounted in Jenkins |
| **Images not pushed** | Docker credentials wrong | Verify Docker Hub login in Jenkins credentials |
| **Tests fail** | Missing dependencies | Add `pip install -r requirements.txt` to build stage |
| **Webhook not triggering** | Jenkins URL unreachable | Ensure Jenkins accessible from GitHub |

---

## Quick Commands

```bash
# View running builds
curl http://localhost:8080/queue/

# Trigger build via API
curl -X POST http://localhost:8080/job/SnapSure-Pipeline/build

# View job config
curl http://localhost:8080/job/SnapSure-Pipeline/config.xml

# Restart Jenkins
curl -X POST http://localhost:8080/restart
```

---

## Next Steps

1. ✅ Push SnapSure to GitHub
2. ✅ Configure Jenkins with Jenkinsfile
3. ✅ Test with manual build
4. ✅ Setup GitHub webhooks
5. ✅ Enable notifications
6. ✅ Deploy Docker images from pipeline
7. ✅ Monitor logs and metrics

---

## Useful Resources

- [Jenkins Official Documentation](https://www.jenkins.io/doc/)
- [Jenkinsfile Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Blue Ocean User guide](https://www.jenkins.io/doc/book/blueocean/)
- [Docker Plugin for Jenkins](https://plugins.jenkins.io/docker/)

---

**Your Jenkins pipeline is now ready to automate SnapSure builds! 🚀**
