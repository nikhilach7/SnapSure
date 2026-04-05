# Jenkins Setup for SnapSure

This guide explains Jenkins in simple steps.

## What Jenkins Does Here

The current pipeline (from `Jenkinsfile`) does this:

1. Pull code from GitHub
2. Install backend and frontend dependencies
3. Build frontend
4. Run checks (lint/tests)
5. Build Docker images
6. On `main`, run `docker compose up -d` and quick health checks

It does not push Docker images to Docker Hub.

## What You Need

- Jenkins running
- Git installed on Jenkins machine
- Docker installed on Jenkins machine
- Node + npm installed
- Python installed
- Repo URL

## Step 1: Create Jenkins Pipeline Job

1. Open Jenkins
2. Click `New Item`
3. Job name: `SnapSure-Pipeline`
4. Choose `Pipeline`
5. Click `OK`

In job config:

- Definition: `Pipeline script from SCM`
- SCM: `Git`
- Repository URL: your GitHub URL
- Branch: `*/main`
- Script Path: `Jenkinsfile`
- Credentials: needed only if repo is private

Save.

## Step 2: Enable Auto Build on GitHub Push

### Jenkins

1. Open job config
2. Under Build Triggers, enable `GitHub hook trigger for GITScm polling`
3. Save

### GitHub

1. Open repo settings
2. Go to `Webhooks` and click `Add webhook`
3. Payload URL: `http://<jenkins-host>:8080/github-webhook/`
4. Content type: `application/json`
5. Events: `Just the push event`
6. Save

Now every push triggers Jenkins.

## Step 3: Run Once Manually

1. Open `SnapSure-Pipeline`
2. Click `Build Now`
3. Check console logs

You should see successful install, build, and Docker stages.

## Credentials Guide

- Public repo: usually no GitHub credential needed
- Private repo: add GitHub PAT credential in Jenkins
- Docker credential: not needed unless you add image push later

## Common Issues

| Problem | Reason | Fix |
|---|---|---|
| Build not auto-starting | Webhook not set correctly | Recreate webhook with `/github-webhook/` |
| Clone fails | Private repo without credentials | Add GitHub PAT credentials |
| Docker build fails | Jenkins user cannot use Docker | Give Docker permission/access |
| Health check fails | Old container/port conflict | Stop old containers and rerun |

## Good Team Practice

1. Protect `main` branch on GitHub
2. Merge via pull requests
3. Keep Jenkins running on every push to `main`

## Optional Next Upgrades

1. Add proper backend unit tests
2. Push images to Docker Hub or another registry
3. Add Slack or email notifications
4. Add timeout and retry rules
