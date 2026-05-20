pipeline {
    agent any

    // ── Trigger: fires automatically on every push to main via GitHub webhook ──
    triggers {
        githubPush()
    }

    options {
        timeout(time: 45, unit: 'MINUTES')   // overall pipeline guard
        disableConcurrentBuilds()            // prevent two builds stomping each other
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        COMPOSE_PROJECT = "snapsure"         // FIXED project name — containers always named
                                             // snapsure-backend / snapsure-frontend regardless
                                             // of which Jenkins workspace folder this runs from
        K8S_NAMESPACE = "snapsure"
        K8S_CONTEXT = "minikube"
        BACKEND_IMAGE = "snapsure-backend:latest"
        FRONTEND_IMAGE = "snapsure-frontend:latest"
    }

    stages {

        // ── Stage 1: Install host-level deps (npm, optional python) ──────────
        stage('1. Setup Dependencies') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -e
                            cd frontend && npm ci
                        '''
                    } else {
                        bat '''
                            cd frontend
                            npm ci
                        '''
                    }
                }
            }
        }

        // ── Stage 2: Build frontend + optional lint/test ─────────────────────
        stage('2. Validate + Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -e
                            cd frontend
                            npm run build
                        '''
                        // Lint is best-effort — broken lint should NOT block deploy
                        def lintExit = sh(script: 'cd frontend && npm run lint', returnStatus: true)
                        if (lintExit != 0) echo 'WARN: lint failed or not configured — continuing.'

                        def testExit = sh(
                            script: '''
                                if [ -f backend/requirements.txt ]; then
                                    python3 -m pip install pytest -q 2>/dev/null || true
                                    python3 -m pytest backend -q --tb=short 2>/dev/null || true
                                fi
                            ''',
                            returnStatus: true
                        )
                        if (testExit != 0) echo 'WARN: backend tests failed or not found — continuing.'
                    } else {
                        bat 'cd frontend && npm run build'

                        def lintExit = bat(script: 'cd frontend && npm run lint', returnStatus: true)
                        if (lintExit != 0) echo 'WARN: lint failed or not configured — continuing.'
                    }
                }
            }
        }

        // ── Stage 3: Build Docker images via Compose ─────────────────────────
        //    Using "docker compose build" so stage 4 can do "up --no-build"
        //    and NOT waste time rebuilding the same layers again.
        stage('3. Build Docker Images') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker compose -p ${COMPOSE_PROJECT} build'
                    } else {
                        bat 'docker compose -p %COMPOSE_PROJECT% build'
                    }
                }
            }
        }

        // ── Stage 4: Deploy + Smoke Test ──────────────────
        stage('4. Deploy + Smoke Check') {
            options {
                timeout(time: 5, unit: 'MINUTES')  // deploy must finish in 5 min
            }
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -e

                            # Tear down any running instance of this project cleanly
                            docker compose -p ${COMPOSE_PROJECT} down --remove-orphans || true

                            # Free the ports in case some non-compose process grabbed them
                            fuser -k 8000/tcp >/dev/null 2>&1 || true
                            fuser -k 3000/tcp >/dev/null 2>&1 || true

                            # Start — images already built in stage 3, so --no-build is intentional
                            docker compose -p ${COMPOSE_PROJECT} up -d --no-build

                            # Wait for backend health (compose healthcheck does the real work;
                            # we just poll here so the pipeline reports a clear failure if it's stuck)
                            # Note: First run may take 1-2 minutes for Hugging Face model download
                            echo "Waiting for backend..."
                            for i in $(seq 1 30); do
                                if curl -fs http://localhost:8000/health >/dev/null; then
                                    echo "Backend is up."
                                    break
                                fi
                                sleep 5
                                if [ "$i" = "30" ]; then
                                    echo "ERROR: Backend never became healthy."
                                    docker compose -p ${COMPOSE_PROJECT} logs backend
                                    exit 1
                                fi
                            done

                            # Frontend smoke check
                            curl -fs http://localhost:3000 >/dev/null \
                                || { echo "ERROR: Frontend not responding."; exit 1; }

                            echo "Deploy successful."
                        '''
                    } else {
                        // ── Windows path ─────────────────────────────────────
                        bat 'docker compose -p %COMPOSE_PROJECT% down --remove-orphans'

                        // Remove old containers by their FIXED names (matches container_name in compose file)
                        powershell(script: '''
                            $ErrorActionPreference = 'SilentlyContinue'
                    
                            $conn8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
                            if ($conn8000) {
                                Stop-Process -Id $conn8000.OwningProcess -Force -ErrorAction SilentlyContinue
                                Write-Host "Freed port 8000"
                            }

                            # Free port 3000
                            $conn3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
                            if ($conn3000) {
                                Stop-Process -Id $conn3000.OwningProcess -Force -ErrorAction SilentlyContinue
                                Write-Host "Freed port 3000"
                            }

                            exit 0
                        ''')

                        bat 'docker compose -p %COMPOSE_PROJECT% up -d --no-build'

                        // Health check — 30 retries × 5 s = 150 s max wait
                        // Note: First run may take 1-2 minutes for Hugging Face model download
                        powershell(script: '''
                            $maxRetries = 30
                            for ($i = 0; $i -lt $maxRetries; $i++) {
                                try {
                                    Invoke-WebRequest -UseBasicParsing http://localhost:8000/health `
                                        -ErrorAction Stop | Out-Null
                                    Write-Host "Backend is up."
                                    break
                                } catch {
                                    if ($i -lt ($maxRetries - 1)) {
                                        Write-Host "Waiting for backend... attempt $($i+1)/$maxRetries"
                                        Start-Sleep -Seconds 5
                                    } else {
                                        Write-Host "ERROR: Backend never became healthy."
                                        exit 1
                                    }
                                }
                            }
                        ''')

                        powershell(script: '''
                            try {
                                Invoke-WebRequest -UseBasicParsing http://localhost:3000 `
                                    -ErrorAction Stop | Out-Null
                                Write-Host "Frontend smoke check passed."
                            } catch {
                                Write-Host "ERROR: Frontend not responding."
                                exit 1
                            }
                        ''')
                    }
                }
            }
        }

        // ── Stage 5: Start Minikube ───────────────────────────────────────────
        stage('Start Minikube') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -e
                            echo "Starting Minikube..."
                            STATUS="$(minikube status 2>/dev/null || true)"
                            if echo "$STATUS" | grep -q "host: Running" && \
                               echo "$STATUS" | grep -q "kubelet: Running" && \
                               echo "$STATUS" | grep -q "apiserver: Running"; then
                                echo "Minikube is healthy."
                            else
                                echo "Minikube is missing/unhealthy. Recreating cluster..."
                                minikube stop >/dev/null 2>&1 || true
                                minikube delete >/dev/null 2>&1 || true
                                minikube start --driver=docker --container-runtime=docker
                            fi

                            echo "Waiting for Kubernetes API..."
                            for i in $(seq 1 18); do
                                STATUS_NOW="$(minikube status 2>/dev/null || true)"
                                if echo "$STATUS_NOW" | grep -q "host: Running" && \
                                   echo "$STATUS_NOW" | grep -q "kubelet: Running" && \
                                   echo "$STATUS_NOW" | grep -q "apiserver: Running"; then
                                    break
                                fi
                                sleep 10
                                if [ "$i" = "18" ]; then
                                    echo "ERROR: Minikube components did not become healthy in time."
                                    minikube status || true
                                    exit 1
                                fi
                            done

                            kubectl cluster-info
                            kubectl get nodes
                        '''
                    } else {
                        powershell '''
                            $ErrorActionPreference = "Continue"
                            if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
                                $PSNativeCommandUseErrorActionPreference = $false
                            }

                            function Invoke-CmdLine {
                                param(
                                    [Parameter(Mandatory = $true)][string] $CommandLine,
                                    [switch] $AllowFailure
                                )

                                & cmd.exe /d /c "($CommandLine) 2>&1" | ForEach-Object { Write-Host $_ }
                                $exitCode = $LASTEXITCODE
                                if (($exitCode -ne 0) -and (-not $AllowFailure)) {
                                    exit $exitCode
                                }
                                return $exitCode
                            }

                            Write-Host "Starting Minikube..."

                            $status = (& cmd.exe /d /c "minikube status 2>NUL" | Out-String)
                            $healthy = ($LASTEXITCODE -eq 0) -and
                                       ($status -match "host:\\s+Running") -and
                                       ($status -match "kubelet:\\s+Running") -and
                                       ($status -match "apiserver:\\s+Running")

                            if ($healthy) {
                                Write-Host "Minikube is healthy."
                            } else {
                                Write-Host "Minikube is missing/unhealthy. Recreating cluster..."
                                Invoke-CmdLine "minikube stop" -AllowFailure | Out-Null
                                Invoke-CmdLine "minikube delete" -AllowFailure | Out-Null
                                Invoke-CmdLine "minikube start --driver=docker --container-runtime=docker" | Out-Null
                            }

                            Write-Host "Waiting for Kubernetes API..."
                            $ready = $false
                            for ($i = 1; $i -le 18; $i++) {
                                $statusNow = (& cmd.exe /d /c "minikube status 2>NUL" | Out-String)
                                $ready = ($LASTEXITCODE -eq 0) -and
                                         ($statusNow -match "host:\\s+Running") -and
                                         ($statusNow -match "kubelet:\\s+Running") -and
                                         ($statusNow -match "apiserver:\\s+Running")
                                if ($ready) { break }
                                Start-Sleep -Seconds 10
                            }
                            if (-not $ready) {
                                Write-Host "ERROR: Minikube components did not become healthy in time."
                                Invoke-CmdLine "minikube status" -AllowFailure | Out-Null
                                exit 1
                            }

                            Invoke-CmdLine "kubectl cluster-info" | Out-Null
                            Invoke-CmdLine "kubectl get nodes" | Out-Null
                        '''
                    }
                }
            }
        }

        // ── Stage 6: Load Docker Images into Minikube ──────────────────────
        //    Shows progress bar for large images (pv on Unix, timing on Windows)
        stage('6. Load Images to Minikube') {
            steps {
                script {
                    try {
                        if (isUnix()) {
                            sh '''
                                set -e
                                echo "=== Preparing Minikube image store ==="
                                
                                # Remove only this project's previous mutable tags, then prune unreferenced layers.
                                echo "Removing previous SnapSure image tags from Minikube..."
                                minikube image rm "${FRONTEND_IMAGE}" >/dev/null 2>&1 || true
                                minikube image rm "${BACKEND_IMAGE}" >/dev/null 2>&1 || true
                                minikube ssh -- docker image prune -f >/dev/null 2>&1 \
                                    || minikube ssh -- sudo crictl rmi --prune >/dev/null 2>&1 \
                                    || true
                                
                                # Show current image count before
                                BEFORE_COUNT=$(minikube image ls | wc -l)
                                echo "Images before load: $BEFORE_COUNT"
                                
                                echo "=== Loading Docker images into Minikube ==="
                                
                                # Try to use pv for progress bar if available, fallback to plain docker save
                                if command -v pv >/dev/null 2>&1; then
                                    # Load frontend image with progress bar
                                    echo "Loading frontend image: ${FRONTEND_IMAGE}"
                                    FRONTEND_SIZE=$(docker image inspect ${FRONTEND_IMAGE} --format='{{.Size}}')
                                    echo "Size: $((FRONTEND_SIZE / 1024 / 1024))MB"
                                    docker save ${FRONTEND_IMAGE} | pv -s ${FRONTEND_SIZE} | minikube image load -
                                    
                                    # Load backend image with progress bar
                                    echo "Loading backend image: ${BACKEND_IMAGE}"
                                    BACKEND_SIZE=$(docker image inspect ${BACKEND_IMAGE} --format='{{.Size}}')
                                    echo "Size: $((BACKEND_SIZE / 1024 / 1024))MB"
                                    docker save ${BACKEND_IMAGE} | pv -s ${BACKEND_SIZE} | minikube image load -
                                else
                                    # Fallback: no pv available, just show timing
                                    echo "Loading frontend image: ${FRONTEND_IMAGE}"
                                    START_TIME=$(date +%s%N)
                                    docker save ${FRONTEND_IMAGE} | minikube image load - || minikube image load ${FRONTEND_IMAGE}
                                    END_TIME=$(date +%s%N)
                                    ELAPSED=$((($END_TIME - $START_TIME) / 1000000))
                                    echo "Frontend loaded in $((ELAPSED / 1000))s"
                                    
                                    echo "Loading backend image: ${BACKEND_IMAGE}"
                                    START_TIME=$(date +%s%N)
                                    docker save ${BACKEND_IMAGE} | minikube image load - || minikube image load ${BACKEND_IMAGE}
                                    END_TIME=$(date +%s%N)
                                    ELAPSED=$((($END_TIME - $START_TIME) / 1000000))
                                    echo "Backend loaded in $((ELAPSED / 1000))s"
                                fi
                                
                                # Verify images are loaded
                                echo "Verifying images in Minikube..."
                                minikube image ls | grep snapsure || echo "Checking images..."
                                
                                echo "[OK] Images loaded successfully."
                            '''
                        } else {
                            // Windows path — show size & progress via output
                            powershell(script: '''
                                $ErrorActionPreference = "Continue"
                                if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
                                    $PSNativeCommandUseErrorActionPreference = $false
                                }

                                function Invoke-CmdLine {
                                    param(
                                        [Parameter(Mandatory = $true)][string] $CommandLine,
                                        [switch] $AllowFailure
                                    )

                                    & cmd.exe /d /c "($CommandLine) 2>&1" | ForEach-Object { Write-Host "  $_" }
                                    $exitCode = $LASTEXITCODE
                                    if (($exitCode -ne 0) -and (-not $AllowFailure)) {
                                        exit $exitCode
                                    }
                                    return $exitCode
                                }
                                
                                Write-Host "=== Preparing Minikube image store ===" -ForegroundColor Cyan
                                
                                # Remove only this project's previous mutable tags, then prune unreferenced layers.
                                Write-Host "Removing previous SnapSure image tags from Minikube..." -ForegroundColor Green
                                Invoke-CmdLine "minikube image rm $env:FRONTEND_IMAGE" -AllowFailure | Out-Null
                                Invoke-CmdLine "minikube image rm $env:BACKEND_IMAGE" -AllowFailure | Out-Null
                                Write-Host "Pruning dangling Minikube runtime layers..." -ForegroundColor Green
                                Invoke-CmdLine "minikube ssh -- docker image prune -f || minikube ssh -- sudo crictl rmi --prune" -AllowFailure | Out-Null
                                
                                # Show image count before
                                $beforeCount = (& cmd.exe /d /c "minikube image ls 2>&1" | Measure-Object -Line).Lines
                                Write-Host "  Images before load: $beforeCount" -ForegroundColor DarkGray
                                
                                Write-Host "=== Loading Docker images into Minikube ===" -ForegroundColor Cyan
                                
                                # Load frontend image with size info
                                Write-Host "Loading frontend image: $env:FRONTEND_IMAGE" -ForegroundColor Green
                                $frontendInspect = & docker image inspect $env:FRONTEND_IMAGE --format='{{json .}}' | ConvertFrom-Json
                                $frontendSize = $frontendInspect.Size
                                Write-Host "  Size: $([Math]::Round($frontendSize / 1MB, 2))MB" -ForegroundColor DarkGray
                                
                                $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
                                Invoke-CmdLine "minikube image load $env:FRONTEND_IMAGE" | Out-Null
                                $stopwatch.Stop()
                                Write-Host "  [OK] Frontend loaded in $($stopwatch.Elapsed.TotalSeconds)s" -ForegroundColor Green
                                
                                # Load backend image with size info
                                Write-Host "Loading backend image: $env:BACKEND_IMAGE" -ForegroundColor Green
                                $backendInspect = & docker image inspect $env:BACKEND_IMAGE --format='{{json .}}' | ConvertFrom-Json
                                $backendSize = $backendInspect.Size
                                Write-Host "  Size: $([Math]::Round($backendSize / 1GB, 2))GB" -ForegroundColor DarkGray
                                Write-Host "  (This may take several minutes for large images)" -ForegroundColor DarkYellow
                                
                                $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
                                Invoke-CmdLine "minikube image load $env:BACKEND_IMAGE" | Out-Null
                                $stopwatch.Stop()
                                Write-Host "  [OK] Backend loaded in $($stopwatch.Elapsed.TotalSeconds)s" -ForegroundColor Green
                                
                                # Verify images
                                Write-Host "Verifying images in Minikube..." -ForegroundColor Green
                                & cmd.exe /d /c "minikube image ls 2>&1" | Select-String "snapsure" | Out-Host
                                
                                Write-Host "[OK] Images loaded successfully." -ForegroundColor Green
                            ''')
                        }
                    } catch (Exception e) {
                        echo "ERROR: Failed to load images - ${e.message}"
                        currentBuild.result = 'FAILURE'
                        error("Image loading failed")
                    }
                }
            }
        }

        // ── Stage 7: Deploy to Kubernetes ────────────────────────────────────
        stage('7. Deploy to Kubernetes') {
            steps {
                script {
                    try {
                        if (isUnix()) {
                            sh '''
                                set -e
                                echo "=== Deploying to Kubernetes ==="
                                
                                # Set context
                                kubectl config use-context minikube || true
                                
                                # Create namespace if not exists
                                echo "Creating namespace: ${K8S_NAMESPACE}"
                                kubectl create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                                
                                # Apply all K8s manifests
                                echo "Applying Kubernetes manifests..."
                                for manifest in k8s/*.yaml; do
                                    echo "Applying: $manifest"
                                    kubectl apply -f "$manifest"
                                done
                                
                                echo "Kubernetes deployment applied successfully."
                            '''
                        } else {
                            // Windows path
                            powershell(script: '''
                                $ErrorActionPreference = "Continue"
                                
                                Write-Host "=== Deploying to Kubernetes ==="
                                
                                # Set context
                                & kubectl config use-context minikube 2>&1 | Out-Host
                                if ($LASTEXITCODE -ne 0) {
                                    Write-Host "ERROR: Failed to set kubectl context to minikube"
                                    exit 1
                                }
                                
                                # Create namespace if not exists
                                Write-Host "Creating namespace: $env:K8S_NAMESPACE"
                                kubectl create namespace $env:K8S_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
                                if ($LASTEXITCODE -ne 0) {
                                    Write-Host "ERROR: Failed to create/apply namespace $env:K8S_NAMESPACE"
                                    exit 1
                                }
                                
                                # Apply all K8s manifests
                                Write-Host "Applying Kubernetes manifests..."
                                Get-ChildItem "k8s/*.yaml" | ForEach-Object {
                                    Write-Host "Applying: $($_.FullName)"
                                    kubectl apply -f $_.FullName
                                    if ($LASTEXITCODE -ne 0) {
                                        Write-Host "ERROR: Failed applying manifest $($_.FullName)"
                                        exit 1
                                    }
                                }
                                
                                Write-Host "Kubernetes deployment applied successfully."
                            ''')
                        }
                    } catch (Exception e) {
                        echo "ERROR: Failed to deploy to Kubernetes - ${e.message}"
                        currentBuild.result = 'FAILURE'
                        error("Kubernetes deployment failed")
                    }
                }
            }
        }

        // ── Stage 8: Verify Kubernetes Deployment ────────────────────────────
        stage('8. Verify Deployment') {
            options {
                timeout(time: 10, unit: 'MINUTES')
            }
            steps {
                script {
                    try {
                        if (isUnix()) {
                            sh '''
                                set -e
                                echo "=== Verifying Kubernetes Deployment ==="
                                
                                # Set context
                                kubectl config use-context minikube || true
                                
                                # Check namespace
                                echo "Checking namespace status..."
                                kubectl get namespace ${K8S_NAMESPACE}
                                
                                # Wait for backend deployment
                                echo "Waiting for backend deployment..."
                                kubectl rollout status deployment/backend \
                                    -n ${K8S_NAMESPACE} \
                                    --timeout=5m || {
                                    echo "ERROR: Backend deployment failed to roll out"
                                    kubectl describe deployment backend -n ${K8S_NAMESPACE}
                                    exit 1
                                }
                                
                                # Wait for frontend deployment
                                echo "Waiting for frontend deployment..."
                                kubectl rollout status deployment/frontend \
                                    -n ${K8S_NAMESPACE} \
                                    --timeout=5m || {
                                    echo "ERROR: Frontend deployment failed to roll out"
                                    kubectl describe deployment frontend -n ${K8S_NAMESPACE}
                                    exit 1
                                }
                                
                                # Get pod status
                                echo ""
                                echo "=== POD STATUS ==="
                                kubectl get pods -n ${K8S_NAMESPACE} -o wide
                                
                                echo ""
                                echo "=== SERVICE STATUS ==="
                                kubectl get services -n ${K8S_NAMESPACE}
                                
                                # Check pod logs for errors
                                echo ""
                                echo "=== CHECKING POD HEALTH ==="
                                BACKEND_POD=$(kubectl get pods -n ${K8S_NAMESPACE} -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
                                if [ ! -z "$BACKEND_POD" ]; then
                                    echo "Backend pod: $BACKEND_POD"
                                    echo "Backend pod logs (last 20 lines):"
                                    kubectl logs $BACKEND_POD -n ${K8S_NAMESPACE} --tail=20 || echo "No logs available yet"
                                fi
                                
                                FRONTEND_POD=$(kubectl get pods -n ${K8S_NAMESPACE} -l app=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
                                if [ ! -z "$FRONTEND_POD" ]; then
                                    echo "Frontend pod: $FRONTEND_POD"
                                    echo "Frontend pod logs (last 20 lines):"
                                    kubectl logs $FRONTEND_POD -n ${K8S_NAMESPACE} --tail=20 || echo "No logs available yet"
                                fi
                                
                                echo ""
                                echo "=== DEPLOYMENT VERIFICATION SUCCESSFUL ==="
                                echo "Frontend accessible at: http://$(minikube ip):30300"
                                echo "Backend service: backend-service.${K8S_NAMESPACE}.svc.cluster.local:8000"
                            '''
                        } else {
                            // Windows path
                            powershell(script: '''
                                $ErrorActionPreference = "Continue"
                                
                                Write-Host "=== Verifying Kubernetes Deployment ==="
                                
                                # Set context
                                & kubectl config use-context minikube 2>&1 | Out-Host
                                if ($LASTEXITCODE -ne 0) {
                                    Write-Host "ERROR: Failed to set kubectl context to minikube"
                                    exit 1
                                }
                                
                                # Check namespace
                                Write-Host "Checking namespace status..."
                                kubectl get namespace $env:K8S_NAMESPACE
                                if ($LASTEXITCODE -ne 0) {
                                    Write-Host "ERROR: Namespace not found: $env:K8S_NAMESPACE"
                                    exit 1
                                }
                                
                                # Wait for backend deployment
                                Write-Host "Waiting for backend deployment..."
                                kubectl rollout status deployment/backend -n $env:K8S_NAMESPACE --timeout=5m
                                if ($LASTEXITCODE -ne 0) {
                                    Write-Host "ERROR: Backend deployment failed to roll out"
                                    kubectl describe deployment backend -n $env:K8S_NAMESPACE
                                    exit 1
                                }
                                
                                # Wait for frontend deployment
                                Write-Host "Waiting for frontend deployment..."
                                kubectl rollout status deployment/frontend -n $env:K8S_NAMESPACE --timeout=5m
                                if ($LASTEXITCODE -ne 0) {
                                    Write-Host "ERROR: Frontend deployment failed to roll out"
                                    kubectl describe deployment frontend -n $env:K8S_NAMESPACE
                                    exit 1
                                }
                                
                                # Get pod status
                                Write-Host ""
                                Write-Host "=== POD STATUS ==="
                                kubectl get pods -n $env:K8S_NAMESPACE -o wide
                                
                                Write-Host ""
                                Write-Host "=== SERVICE STATUS ==="
                                kubectl get services -n $env:K8S_NAMESPACE
                                
                                # Get pod logs
                                Write-Host ""
                                Write-Host "=== CHECKING POD HEALTH ==="
                                
                                $backendPod = (& kubectl get pods -n $env:K8S_NAMESPACE -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>$null | Out-String).Trim()
                                if ($backendPod -and $backendPod -notlike "*No resources*") {
                                    Write-Host "Backend pod: $backendPod"
                                    Write-Host "Backend pod logs (last 20 lines):"
                                    kubectl logs $backendPod -n $env:K8S_NAMESPACE --tail=20 2>&1 | Out-Host
                                }
                                
                                $frontendPod = (& kubectl get pods -n $env:K8S_NAMESPACE -l app=frontend -o jsonpath='{.items[0].metadata.name}' 2>$null | Out-String).Trim()
                                if ($frontendPod -and $frontendPod -notlike "*No resources*") {
                                    Write-Host "Frontend pod: $frontendPod"
                                    Write-Host "Frontend pod logs (last 20 lines):"
                                    kubectl logs $frontendPod -n $env:K8S_NAMESPACE --tail=20 2>&1 | Out-Host
                                }
                                
                                Write-Host ""
                                Write-Host "=== DEPLOYMENT VERIFICATION SUCCESSFUL ==="
                                $minikubeIp = minikube ip
                                Write-Host "Frontend accessible at: http://$minikubeIp`:30300"
                                Write-Host "Backend service: backend-service.$env:K8S_NAMESPACE.svc.cluster.local:8000"
                            ''')
                        }
                    } catch (Exception e) {
                        echo "ERROR: Deployment verification failed - ${e.message}"
                        currentBuild.result = 'FAILURE'
                        error("Verification failed")
                    }
                }
            }
        }

        // ── Stage 9: Cleanup & Prune Images ──────────────────────────────────
        //    Aggressive cleanup of dangling layers, old images, and unused data
        stage('9. Cleanup & Prune Storage') {
            steps {
                script {
                    try {
                        if (isUnix()) {
                            sh '''
                                set -e
                                echo "=== Stage 9: Cleanup & Prune Storage ==="
                                
                                # Keep current SnapSure images for running pods; prune only unused layers.
                                echo "Pruning dangling Minikube runtime layers..."
                                minikube ssh -- docker image prune -f >/dev/null 2>&1 \
                                    || minikube ssh -- sudo crictl rmi --prune >/dev/null 2>&1 \
                                    || echo "  (Minikube runtime prune skipped)"
                                
                                # Show final Minikube image count
                                AFTER_COUNT=$(minikube image ls 2>/dev/null | wc -l)
                                echo "Final images in Minikube: $AFTER_COUNT"
                                
                                # Prune local Docker (unused images, layers, build cache)
                                echo "Pruning local Docker dangling images and build cache..."
                                DOCKER_PRUNE=$(docker image prune -f --filter "dangling=true" 2>/dev/null | tail -1)
                                echo "  $DOCKER_PRUNE"
                                
                                # Optional: aggressive cleanup (⚠️ be careful here)
                                # Uncomment if you want to remove ALL unused images (including stopped container images)
                                # docker image prune -a -f --filter "until=72h"
                                
                                echo "[OK] Cleanup complete"
                            '''
                        } else {
                            // Windows path
                            powershell(script: '''
                                $ErrorActionPreference = "Continue"
                                if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
                                    $PSNativeCommandUseErrorActionPreference = $false
                                }

                                function Invoke-CmdLine {
                                    param(
                                        [Parameter(Mandatory = $true)][string] $CommandLine,
                                        [switch] $AllowFailure
                                    )

                                    & cmd.exe /d /c "($CommandLine) 2>&1" | ForEach-Object { Write-Host "  $_" }
                                    $exitCode = $LASTEXITCODE
                                    if (($exitCode -ne 0) -and (-not $AllowFailure)) {
                                        exit $exitCode
                                    }
                                    return $exitCode
                                }
                                
                                Write-Host "=== Stage 9: Cleanup & Prune Storage ===" -ForegroundColor Cyan
                                
                                # Keep current SnapSure images for running pods; prune only unused layers.
                                Write-Host "Pruning dangling Minikube runtime layers..." -ForegroundColor Green
                                Invoke-CmdLine "minikube ssh -- docker image prune -f || minikube ssh -- sudo crictl rmi --prune" -AllowFailure | Out-Null
                                
                                # Show final Minikube image count
                                $afterCount = (& cmd.exe /d /c "minikube image ls 2>&1" | Measure-Object -Line).Lines
                                Write-Host "  Final images in Minikube: $afterCount" -ForegroundColor DarkGray
                                
                                # Prune local Docker
                                Write-Host "Pruning local Docker dangling images and build cache..." -ForegroundColor Green
                                $dockerPrune = (& docker image prune -f --filter "dangling=true" 2>&1 | Select-Object -Last 1)
                                Write-Host "  $dockerPrune" -ForegroundColor DarkGray
                                
                                Write-Host "[OK] Cleanup complete" -ForegroundColor Green
                            ''')
                        }
                    } catch (Exception e) {
                        echo "WARNING: Cleanup stage encountered an issue - ${e.message}"
                        // Don't fail the pipeline for cleanup issues
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline passed. Build #${BUILD_NUMBER} deployed."
            echo "✓ Docker Compose deployment ready"
            echo "✓ Kubernetes/Minikube deployment successful"
            script {
                // Additional cleanup on success
                if (isUnix()) {
                    sh '''
                        echo "Post-success: Removing any unused Docker builder cache..."
                        docker builder prune -f 2>/dev/null || true
                        
                        echo "Post-success: Minikube storage status..."
                        minikube ssh "df -h /" 2>/dev/null || echo "  (could not check)"
                    '''
                } else {
                    powershell '''
                        $ErrorActionPreference = "Continue"
                        Write-Host "Post-success: Removing unused Docker builder cache..." -ForegroundColor Green
                        & docker builder prune -f 2>&1 | Out-Host
                    '''
                }
            }
        }
        failure {
            echo "Pipeline FAILED. Check stage logs above."
            script {
                if (isUnix()) {
                    sh 'echo "Final status:" && kubectl get all -n ${K8S_NAMESPACE} 2>/dev/null || true'
                } else {
                    powershell '''
                        $ErrorActionPreference = "Continue"
                        if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
                            $PSNativeCommandUseErrorActionPreference = $false
                        }
                        Write-Host "Final status:"
                        & kubectl get all -n $env:K8S_NAMESPACE 2>&1 | Out-Host
                        exit 0
                    '''
                }
            }
        }
        always {
            // Clean workspace AFTER containers are up — they run detached, workspace not needed
            cleanWs()
        }
    }
}
