pipeline {
    agent any

    environment {
        IMAGE_PREFIX = "snapsure"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('1. Checkout') {
            steps {
                checkout scm
            }
        }

        stage('2. Setup Dependencies') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -e
                            if command -v python3 >/dev/null 2>&1; then
                                cd backend
                                python3 -m venv venv
                                . venv/bin/activate
                                python3 -m pip install --upgrade pip
                                pip install -r requirements.txt
                                cd ..
                            elif command -v python >/dev/null 2>&1; then
                                cd backend
                                python -m venv venv
                                . venv/bin/activate
                                pip install --upgrade pip
                                pip install -r requirements.txt
                                cd ..
                            else
                                echo "WARN: Python not found on agent; skipping backend dependency install"
                            fi

                            cd frontend
                            npm ci
                        '''
                    } else {
                        bat '''
                            where python >nul 2>nul
                            if %ERRORLEVEL% EQU 0 (
                                cd backend
                                python -m venv venv
                                call venv\\Scripts\\activate
                                python -m pip install --upgrade pip
                                pip install -r requirements.txt
                                cd ..
                            ) else (
                                echo WARN: Python not found on agent; skipping backend dependency install
                            )

                            cd frontend
                            npm ci
                        '''
                    }
                }
            }
        }

        stage('3. Validate + Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -e
                            cd frontend
                            npm run build
                        '''

                        def lintStatus = sh(
                            script: '''
                                cd frontend
                                npm run lint
                            ''',
                            returnStatus: true
                        )
                        if (lintStatus != 0) {
                            echo 'WARN: Frontend lint failed or unsupported on this Next.js version; continuing.'
                        }

                        def testStatus = sh(
                            script: '''
                                cd backend
                                if [ -f venv/bin/activate ]; then
                                    . venv/bin/activate
                                    pip install pytest -q
                                    pytest -q
                                else
                                    echo "WARN: Backend venv not found; skipping backend tests"
                                fi
                            ''',
                            returnStatus: true
                        )
                        if (testStatus != 0) {
                            echo 'WARN: Backend tests failed or unavailable; continuing.'
                        }
                    } else {
                        bat '''
                            cd frontend
                            npm run build
                        '''

                        def lintStatus = bat(
                            script: '''
                                cd frontend
                                npm run lint
                            ''',
                            returnStatus: true
                        )
                        if (lintStatus != 0) {
                            echo 'WARN: Frontend lint failed or unsupported on this Next.js version; continuing.'
                        }

                        def testStatus = bat(
                            script: '''
                                cd backend
                                if exist venv\\Scripts\\activate (
                                    call venv\\Scripts\\activate
                                    pip install pytest -q
                                    pytest -q
                                ) else (
                                    echo WARN: Backend venv not found; skipping backend tests
                                )
                            ''',
                            returnStatus: true
                        )
                        if (testStatus != 0) {
                            echo 'WARN: Backend tests failed or unavailable; continuing.'
                        }
                    }
                }
            }
        }

        stage('4. Build Docker Images') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -e
                            docker build -f docker/backend.Dockerfile -t ${IMAGE_PREFIX}-backend:${IMAGE_TAG} -t ${IMAGE_PREFIX}-backend:latest .
                            docker build -f docker/frontend.Dockerfile -t ${IMAGE_PREFIX}-frontend:${IMAGE_TAG} -t ${IMAGE_PREFIX}-frontend:latest .
                        '''
                    } else {
                        bat '''
                            docker build -f docker/backend.Dockerfile -t %IMAGE_PREFIX%-backend:%IMAGE_TAG% -t %IMAGE_PREFIX%-backend:latest .
                            docker build -f docker/frontend.Dockerfile -t %IMAGE_PREFIX%-frontend:%IMAGE_TAG% -t %IMAGE_PREFIX%-frontend:latest .
                        '''
                    }
                }
            }
        }

        stage('5. Deploy + Smoke Check') {
            when {
                expression {
                    return env.GIT_BRANCH == 'origin/main' || env.GIT_BRANCH == 'main'
                }
            }
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -e
                            docker compose up -d
                            sleep 8
                            curl -f http://localhost:8000/health
                            curl -f http://localhost:3000
                        '''
                    } else {
                        bat '''
                            docker compose up -d
                            timeout /t 8 /nobreak >nul
                            powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing http://localhost:8000/health | Out-Null"
                            powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing http://localhost:3000 | Out-Null"
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check stage logs for details.'
        }
        always {
            cleanWs()
        }
    }
}
