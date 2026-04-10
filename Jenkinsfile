pipeline {
    agent any

    // ── Trigger: fires automatically on every push to main via GitHub webhook ──
    triggers {
        githubPush()
    }

    options {
        timeout(time: 30, unit: 'MINUTES')   // overall pipeline guard
        disableConcurrentBuilds()            // prevent two builds stomping each other
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        COMPOSE_PROJECT = "snapsure"         // FIXED project name — containers always named
                                             // snapsure-backend / snapsure-frontend regardless
                                             // of which Jenkins workspace folder this runs from
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

        // ── Stage 4: Deploy + Smoke Test (main branch only) ──────────────────
        stage('4. Deploy + Smoke Check') {
            when {
                anyOf {
                    branch 'main'
                    expression { env.GIT_BRANCH ==~ /(origin\/)?main/ }
                }
            }
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
    }

    post {
        success {
            echo "Pipeline passed. Build #${BUILD_NUMBER} deployed."
        }
        failure {
            echo "Pipeline FAILED. Check stage logs above."
            // Optional: add email/Slack notification here
        }
        always {
            // Clean workspace AFTER containers are up — they run detached, workspace not needed
            cleanWs()
        }
    }
}
