#!/usr/bin/env powershell
# SnapSure Jenkins Quick Setup
# One-command Jenkins setup with Docker

param(
    [ValidateSet("start", "stop", "status", "logs", "url")]
    [string]$Action = "status"
)

$CONTAINER_NAME = "snapsure-jenkins"
$PORT = "8080"
$ADMIN_PORT = "50000"
$VOLUME_NAME = "jenkins_home"

function Show-Usage {
    Write-Host "Jenkins Setup & Control Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: ./jenkins-setup.ps1 [action]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Yellow
    Write-Host "  start       - Start Jenkins container"
    Write-Host "  stop        - Stop Jenkins container"
    Write-Host "  status      - Show container status"
    Write-Host "  logs        - Stream Jenkins logs"
    Write-Host "  url         - Show Jenkins access URL"
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Green
    Write-Host "  ./jenkins-setup.ps1 start"
    Write-Host "  ./jenkins-setup.ps1 logs"
}

function Start-Jenkins {
    Write-Host "🚀 Starting Jenkins..." -ForegroundColor Green
    
    # Check if Docker is running
    $docker_status = docker info 2>&1 | Select-Object -First 1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        return
    }

    # Create volume if not exists
    $volume_exists = docker volume ls -q | Select-String $VOLUME_NAME
    if (-not $volume_exists) {
        Write-Host "📦 Creating Jenkins volume..."
        docker volume create $VOLUME_NAME
    }

    # Check if container already running
    $running = docker ps --filter "name=$CONTAINER_NAME" -q
    if ($running) {
        Write-Host "⚠️  Jenkins is already running (ID: $running)" -ForegroundColor Yellow
        return
    }

    # Check if container exists but stopped
    $exists = docker ps -a --filter "name=$CONTAINER_NAME" -q
    if ($exists) {
        Write-Host "⏸️  Restarting Jenkins container..."
        docker start $CONTAINER_NAME
    }
    else {
        Write-Host "🐳 Creating new Jenkins container..."
        docker run -d `
            --name $CONTAINER_NAME `
            -p ${PORT}:8080 `
            -p ${ADMIN_PORT}:50000 `
            -v ${VOLUME_NAME}:/var/jenkins_home `
            -v /var/run/docker.sock:/var/run/docker.sock `
            -e JAVA_OPTS="-Xmx2g" `
            jenkins/jenkins:lts
        
        Write-Host "⏳ Waiting for Jenkins to start (30 seconds)..." -ForegroundColor Cyan
        Start-Sleep -Seconds 30
    }

    Write-Host "✅ Jenkins is starting!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Access Jenkins at:" -ForegroundColor Yellow
    Write-Host "   http://localhost:${PORT}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔑 To get initial admin password:" -ForegroundColor Yellow
    Write-Host "   ./jenkins-setup.ps1 logs" -ForegroundColor Cyan
    Write-Host ""
}

function Stop-Jenkins {
    Write-Host "🛑 Stopping Jenkins..." -ForegroundColor Yellow
    
    $running = docker ps --filter "name=$CONTAINER_NAME" -q
    if ($running) {
        docker stop $CONTAINER_NAME
        Write-Host "✅ Jenkins stopped" -ForegroundColor Green
    }
    else {
        Write-Host "ℹ️  Jenkins is not running" -ForegroundColor Gray
    }
}

function Show-Status {
    Write-Host "📊 Jenkins Container Status" -ForegroundColor Cyan
    Write-Host ""
    
    $container = docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    if ($container) {
        Write-Host $container -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  No Jenkins container found" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Volumes:" -ForegroundColor Yellow
    docker volume ls --filter "name=$VOLUME_NAME" --format "table {{.Name}}"
}

function Show-Logs {
    Write-Host "📜 Jenkins Logs (Ctrl+C to stop)" -ForegroundColor Cyan
    Write-Host ""
    
    $running = docker ps --filter "name=$CONTAINER_NAME" -q
    if ($running) {
        docker logs -f $CONTAINER_NAME
    }
    else {
        Write-Host "❌ Jenkins container is not running" -ForegroundColor Red
    }
}

function Show-Logs-Initial {
    Write-Host "🔑 Initial Admin Password" -ForegroundColor Cyan
    Write-Host ""
    
    $running = docker ps --filter "name=$CONTAINER_NAME" -q
    if ($running) {
        $password_line = docker logs $CONTAINER_NAME 2>&1 | Select-String "initialAdminPassword"
        if ($password_line) {
            Write-Host $password_line -ForegroundColor Green
        }
        else {
            Write-Host "⏳ Jenkins is still starting... try again in a moment" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "❌ Jenkins container is not running" -ForegroundColor Red
    }
}

function Show-URL {
    Write-Host "🌐 Jenkins Access URLs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Main Dashboard:" -ForegroundColor Yellow
    Write-Host "  http://localhost:${PORT}/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Blue Ocean UI:" -ForegroundColor Yellow
    Write-Host "  http://localhost:${PORT}/blue/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Manage Jenkins:" -ForegroundColor Yellow
    Write-Host "  http://localhost:${PORT}/manage/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "SnapSure Pipeline:" -ForegroundColor Yellow
    Write-Host "  http://localhost:${PORT}/job/SnapSure-Pipeline/" -ForegroundColor Cyan
    Write-Host ""
}

# Main
switch ($Action) {
    "start" { Start-Jenkins }
    "stop" { Stop-Jenkins }
    "status" { Show-Status }
    "logs" { Show-Logs-Initial; Write-Host ""; Show-Logs }
    "url" { Show-URL }
    default { Show-Usage }
}
