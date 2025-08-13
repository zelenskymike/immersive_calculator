# Deployment Architecture - Immersion Cooling TCO Calculator

## Executive Summary

This document defines the comprehensive deployment architecture for the Immersion Cooling TCO Calculator, designed for cloud-native deployment with high availability, scalability, and operational excellence. The architecture supports multiple environments, automated deployments, comprehensive monitoring, and disaster recovery capabilities.

## Deployment Strategy Overview

### Multi-Environment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV_WEB[Web App<br/>1 instance]
        DEV_API[API Server<br/>1 instance]
        DEV_DB[(PostgreSQL<br/>Single instance)]
        DEV_REDIS[(Redis<br/>Single instance)]
    end
    
    subgraph "Staging"
        STG_LB[Load Balancer]
        STG_WEB[Web App<br/>2 instances]
        STG_API[API Server<br/>2 instances]
        STG_DB[(PostgreSQL<br/>Primary + Replica)]
        STG_REDIS[(Redis<br/>Single instance)]
    end
    
    subgraph "Production"
        PROD_CDN[Global CDN]
        PROD_LB[Load Balancer<br/>Multi-AZ]
        PROD_WEB[Web App<br/>3+ instances]
        PROD_API[API Server<br/>3+ instances]
        PROD_DB[(PostgreSQL<br/>HA Cluster)]
        PROD_REDIS[(Redis<br/>Cluster)]
        PROD_MONITOR[Monitoring<br/>& Alerting]
    end
    
    DEV_WEB --> DEV_API
    DEV_API --> DEV_DB
    DEV_API --> DEV_REDIS
    
    STG_LB --> STG_WEB
    STG_LB --> STG_API
    STG_API --> STG_DB
    STG_API --> STG_REDIS
    
    PROD_CDN --> PROD_LB
    PROD_LB --> PROD_WEB
    PROD_LB --> PROD_API
    PROD_API --> PROD_DB
    PROD_API --> PROD_REDIS
    PROD_MONITOR --> PROD_API
```

## Cloud Infrastructure Architecture

### AWS-Based Deployment (Primary)

```mermaid
graph TB
    subgraph "AWS Global Infrastructure"
        subgraph "Route 53"
            DNS[DNS Management<br/>Health Checks<br/>Failover Routing]
        end
        
        subgraph "CloudFront"
            CDN[Global CDN<br/>Edge Locations<br/>SSL Termination]
        end
        
        subgraph "US-East-1 (Primary)"
            subgraph "VPC - Production"
                subgraph "Public Subnets"
                    ALB[Application Load Balancer<br/>Multi-AZ]
                    NAT[NAT Gateway<br/>Multi-AZ]
                end
                
                subgraph "Private Subnets - App Tier"
                    ECS_WEB[ECS Fargate<br/>Web App Containers]
                    ECS_API[ECS Fargate<br/>API Containers]
                end
                
                subgraph "Private Subnets - Data Tier"
                    RDS_PRIMARY[(RDS PostgreSQL<br/>Multi-AZ Primary)]
                    RDS_REPLICA[(RDS PostgreSQL<br/>Read Replica)]
                    ELASTICACHE[ElastiCache Redis<br/>Cluster Mode]
                end
            end
        end
        
        subgraph "US-West-2 (DR)"
            subgraph "VPC - Disaster Recovery"
                RDS_DR[(RDS PostgreSQL<br/>Cross-Region Replica)]
                S3_DR[S3 Bucket<br/>Cross-Region Replication]
            end
        end
        
        subgraph "Shared Services"
            S3_PRIMARY[S3 Bucket<br/>Reports & Assets]
            CLOUDWATCH[CloudWatch<br/>Monitoring & Logs]
            SECRETS[Secrets Manager<br/>Credentials]
            ECR[ECR<br/>Container Registry]
        end
    end
    
    DNS --> CDN
    CDN --> ALB
    ALB --> ECS_WEB
    ALB --> ECS_API
    ECS_API --> RDS_PRIMARY
    ECS_API --> RDS_REPLICA
    ECS_API --> ELASTICACHE
    ECS_API --> S3_PRIMARY
    RDS_PRIMARY --> RDS_DR
    S3_PRIMARY --> S3_DR
```

### Infrastructure as Code (Terraform)

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket         = "tco-calculator-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "tco-calculator"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC and Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "${var.project_name}-${var.environment}"
  cidr = var.vpc_cidr
  
  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs
  
  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets
  
  enable_deletion_protection = var.environment == "production"
  
  access_logs {
    bucket  = aws_s3_bucket.logs.bucket
    prefix  = "alb-logs"
    enabled = true
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"
  
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
  }
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-ecs"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "main" {
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage  = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds.arn
  
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = var.db_instance_class
  
  identifier = "${var.project_name}-${var.environment}-db"
  
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = var.environment == "production"
  publicly_accessible    = false
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "main" {
  description          = "${var.project_name}-${var.environment} Redis cluster"
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  
  node_type = var.redis_node_type
  port      = 6379
  
  num_cache_clusters = var.environment == "production" ? 3 : 1
  
  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth.result
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}

# Variables
variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
```

## Container Architecture

### Docker Configuration

#### Multi-Stage Frontend Build
```dockerfile
# Dockerfile.frontend
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nginx -u 1001 -G nodejs && \
    chown -R nginx:nodejs /usr/share/nginx/html && \
    chown -R nginx:nodejs /var/cache/nginx && \
    chown -R nginx:nodejs /var/log/nginx

USER nginx

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Backend API Container
```dockerfile
# Dockerfile.api
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source code and build
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

# Production dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Install production dependencies and built app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package*.json ./

# Health check script
COPY --chown=nodejs:nodejs healthcheck.js ./

# Install curl for health checks
RUN apk add --no-cache curl

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js

CMD ["node", "dist/server.js"]
```

### Container Orchestration with ECS

#### ECS Task Definitions
```json
{
  "family": "tco-calculator-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/tco-calculator-task-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tco-calculator-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:tco-calculator/database-url"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:tco-calculator/redis-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tco-calculator-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node healthcheck.js"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### ECS Service Configuration
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  web:
    image: ${ECR_REGISTRY}/tco-calculator-web:${IMAGE_TAG}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 30s
        failure_action: rollback
        monitor: 60s
        max_failure_ratio: 0.1
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
        window: 120s
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - frontend

  api:
    image: ${ECR_REGISTRY}/tco-calculator-api:${IMAGE_TAG}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 30s
        failure_action: rollback
        monitor: 60s
        max_failure_ratio: 0.1
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
        window: 120s
    environment:
      - NODE_ENV=production
    secrets:
      - database_url
      - redis_url
      - jwt_secret
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - frontend
      - backend

networks:
  frontend:
    driver: overlay
  backend:
    driver: overlay

secrets:
  database_url:
    external: true
  redis_url:
    external: true
  jwt_secret:
    external: true
```

## CI/CD Pipeline Architecture

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS ECS

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com
  ECR_REPOSITORY_API: tco-calculator-api
  ECR_REPOSITORY_WEB: tco-calculator-web

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: tco_calculator_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=1024m
        ports:
          - 5432:5432
      
      redis:
        image: redis:6-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run tests
        run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/tco_calculator_test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level moderate
      
      - name: Run Snyk security test
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=medium

  build-and-push:
    name: Build and Push Images
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY_API }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build and push API image
        id: build-api
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.api
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64
      
      - name: Build and push Web image
        id: build-web
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.frontend
          push: true
          tags: ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY_WEB }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64
      
      - name: Sign images with Cosign
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          cosign sign ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY_API }}@${{ steps.build-api.outputs.digest }}
          cosign sign ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY_WEB }}@${{ steps.build-web.outputs.digest }}

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster tco-calculator-staging \
            --service tco-calculator-api-service \
            --force-new-deployment \
            --wait
      
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster tco-calculator-staging \
            --services tco-calculator-api-service
      
      - name: Run smoke tests
        run: |
          ./scripts/smoke-tests.sh https://staging-api.tco-calculator.com

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Blue-Green Deployment
        run: |
          # Create new task definition
          NEW_TASK_DEF=$(aws ecs describe-task-definition \
            --task-definition tco-calculator-api \
            --query 'taskDefinition' \
            --output json | jq --arg IMAGE "${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY_API }}:${{ github.sha }}" \
            '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')
          
          # Register new task definition
          NEW_REVISION=$(echo $NEW_TASK_DEF | aws ecs register-task-definition \
            --cli-input-json file:///dev/stdin \
            --query 'taskDefinition.revision' \
            --output text)
          
          # Update service with new task definition
          aws ecs update-service \
            --cluster tco-calculator-production \
            --service tco-calculator-api-service \
            --task-definition tco-calculator-api:$NEW_REVISION \
            --wait
      
      - name: Wait for stable deployment
        run: |
          aws ecs wait services-stable \
            --cluster tco-calculator-production \
            --services tco-calculator-api-service
      
      - name: Run production smoke tests
        run: |
          ./scripts/smoke-tests.sh https://api.tco-calculator.com
      
      - name: Update CloudFront distribution
        run: |
          DISTRIBUTION_ID=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?Comment=='TCO Calculator Production'].Id" \
            --output text)
          
          aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*"

  notify:
    name: Notify Team
    runs-on: ubuntu-latest
    needs: [deploy-staging, deploy-production]
    if: always()
    
    steps:
      - name: Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Monitoring and Observability

### CloudWatch Configuration
```yaml
# cloudformation/monitoring.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Monitoring and alerting stack for TCO Calculator'

Parameters:
  Environment:
    Type: String
    AllowedValues: [development, staging, production]
  
  SlackWebhookUrl:
    Type: String
    NoEcho: true

Resources:
  # CloudWatch Log Groups
  APILogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/ecs/tco-calculator-api-${Environment}'
      RetentionInDays: !If [IsProduction, 30, 7]

  WebLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/ecs/tco-calculator-web-${Environment}'
      RetentionInDays: !If [IsProduction, 30, 7]

  # Custom Metrics
  CalculationMetric:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: !Ref APILogGroup
      FilterPattern: '[timestamp, requestId, level="INFO", message="Calculation completed", ...]'
      MetricTransformations:
        - MetricNamespace: TCOCalculator
          MetricName: CalculationsPerMinute
          MetricValue: '1'
          DefaultValue: 0

  ErrorMetric:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: !Ref APILogGroup
      FilterPattern: '[timestamp, requestId, level="ERROR", ...]'
      MetricTransformations:
        - MetricNamespace: TCOCalculator
          MetricName: Errors
          MetricValue: '1'
          DefaultValue: 0

  # CloudWatch Alarms
  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'TCO-Calculator-${Environment}-High-Error-Rate'
      AlarmDescription: 'High error rate detected'
      MetricName: Errors
      Namespace: TCOCalculator
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SNSTopic

  DatabaseConnectionsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'TCO-Calculator-${Environment}-DB-Connections-High'
      AlarmDescription: 'Database connections approaching limit'
      MetricName: DatabaseConnections
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Sub 'tco-calculator-${Environment}-db'

  # SNS Topic for Alerts
  SNSTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub 'tco-calculator-${Environment}-alerts'
      DisplayName: !Sub 'TCO Calculator ${Environment} Alerts'

  # Lambda function for Slack notifications
  SlackNotificationFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'tco-calculator-${Environment}-slack-notifier'
      Runtime: python3.9
      Handler: index.handler
      Code:
        ZipFile: |
          import json
          import urllib3
          import os
          
          def handler(event, context):
              http = urllib3.PoolManager()
              
              message = json.loads(event['Records'][0]['Sns']['Message'])
              alarm_name = message['AlarmName']
              new_state = message['NewStateValue']
              reason = message['NewStateReason']
              
              color = "danger" if new_state == "ALARM" else "good"
              
              slack_message = {
                  "attachments": [
                      {
                          "color": color,
                          "title": f"CloudWatch Alarm: {alarm_name}",
                          "text": f"State: {new_state}\nReason: {reason}",
                          "footer": "TCO Calculator Monitoring"
                      }
                  ]
              }
              
              response = http.request(
                  'POST',
                  os.environ['SLACK_WEBHOOK_URL'],
                  body=json.dumps(slack_message),
                  headers={'Content-Type': 'application/json'}
              )
              
              return {
                  'statusCode': 200,
                  'body': json.dumps('Success')
              }
      Environment:
        Variables:
          SLACK_WEBHOOK_URL: !Ref SlackWebhookUrl
      Role: !GetAtt SlackNotificationRole.Arn

Conditions:
  IsProduction: !Equals [!Ref Environment, production]
```

### Application Performance Monitoring
```typescript
// src/monitoring/apm.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'tco-calculator-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
  }),
  
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces'
  }),
  
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics'
    }),
    exportIntervalMillis: 30000
  }),
  
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-redis': {
      enabled: true,
      requestHook: (span, requestInfo) => {
        span.setAttributes({
          'redis.database_index': requestInfo.db || 0,
        });
      }
    },
    '@opentelemetry/instrumentation-pg': {
      enabled: true,
      requestHook: (span, queryConfig) => {
        span.setAttributes({
          'db.statement': queryConfig.text
        });
      }
    }
  })]
});

// Start the SDK
sdk.start();

// Custom metrics
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('tco-calculator-api', '1.0.0');

export const calculationCounter = meter.createCounter('calculations_total', {
  description: 'Total number of calculations performed'
});

export const calculationDuration = meter.createHistogram('calculation_duration_ms', {
  description: 'Duration of calculation operations in milliseconds'
});

export const activeUsers = meter.createUpDownCounter('active_users', {
  description: 'Number of currently active users'
});

// Usage in application code
import { trace } from '@opentelemetry/api';
import { calculationCounter, calculationDuration } from './monitoring/apm';

export class CalculationService {
  async calculateTCO(config: CalculationConfig): Promise<CalculationResults> {
    const span = trace.getActiveSpan();
    const startTime = Date.now();
    
    try {
      span?.setAttributes({
        'calculation.currency': config.financial.currency,
        'calculation.analysis_years': config.financial.analysisYears,
        'calculation.air_cooling_racks': config.airCooling.rackCount
      });
      
      const results = await this.performCalculation(config);
      
      // Record metrics
      calculationCounter.add(1, {
        currency: config.financial.currency,
        success: 'true'
      });
      
      calculationDuration.record(Date.now() - startTime, {
        currency: config.financial.currency
      });
      
      span?.setStatus({ code: 1 }); // OK
      return results;
      
    } catch (error) {
      calculationCounter.add(1, {
        currency: config.financial.currency,
        success: 'false'
      });
      
      span?.setStatus({
        code: 2, // ERROR
        message: error.message
      });
      
      throw error;
    }
  }
}
```

## Disaster Recovery and Business Continuity

### Multi-Region Architecture
```yaml
# terraform/disaster-recovery.tf
# Cross-region replication for RDS
resource "aws_db_instance" "replica" {
  count = var.environment == "production" ? 1 : 0
  
  identifier = "${var.project_name}-${var.environment}-replica"
  
  # Cross-region read replica
  replicate_source_db = aws_db_instance.main.identifier
  instance_class     = var.db_instance_class
  
  # Different region for DR
  availability_zone = "${var.dr_region}a"
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  
  tags = {
    Name = "${var.project_name}-${var.environment}-dr-replica"
    Role = "disaster-recovery"
  }
}

# S3 Cross-region replication
resource "aws_s3_bucket_replication_configuration" "main" {
  count = var.environment == "production" ? 1 : 0
  
  role   = aws_iam_role.s3_replication[0].arn
  bucket = aws_s3_bucket.main.id
  
  rule {
    id     = "replicate-all"
    status = "Enabled"
    
    destination {
      bucket        = aws_s3_bucket.dr[0].arn
      storage_class = "STANDARD_IA"
      
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.s3_dr[0].arn
      }
    }
  }
}

# Route 53 Health Checks and Failover
resource "aws_route53_health_check" "primary" {
  count = var.environment == "production" ? 1 : 0
  
  fqdn                            = var.primary_domain
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = 3
  request_interval                = 30
  cloudwatch_alarm_region         = var.aws_region
  cloudwatch_alarm_name           = aws_cloudwatch_metric_alarm.health_check[0].alarm_name
  insufficient_data_health_status = "Failure"
  
  tags = {
    Name = "${var.project_name}-primary-health-check"
  }
}

resource "aws_route53_record" "primary" {
  count = var.environment == "production" ? 1 : 0
  
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  
  set_identifier = "primary"
  
  failover_routing_policy {
    type = "PRIMARY"
  }
  
  health_check_id = aws_route53_health_check.primary[0].id
  
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "secondary" {
  count = var.environment == "production" ? 1 : 0
  
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  
  set_identifier = "secondary"
  
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  alias {
    name                   = aws_lb.dr[0].dns_name
    zone_id                = aws_lb.dr[0].zone_id
    evaluate_target_health = true
  }
}
```

### Backup and Recovery Procedures
```bash
#!/bin/bash
# scripts/backup-restore.sh

set -euo pipefail

ENVIRONMENT=${1:-staging}
BACKUP_TYPE=${2:-full}
DATE=$(date +%Y%m%d_%H%M%S)

case $BACKUP_TYPE in
  "full")
    echo "Performing full backup for environment: $ENVIRONMENT"
    
    # Database backup
    echo "Creating database backup..."
    aws rds create-db-snapshot \
      --db-instance-identifier "tco-calculator-$ENVIRONMENT-db" \
      --db-snapshot-identifier "tco-calculator-$ENVIRONMENT-backup-$DATE"
    
    # Wait for snapshot completion
    aws rds wait db-snapshot-completed \
      --db-snapshot-identifier "tco-calculator-$ENVIRONMENT-backup-$DATE"
    
    # Application data backup
    echo "Backing up application data..."
    aws s3 sync \
      s3://tco-calculator-$ENVIRONMENT-data \
      s3://tco-calculator-$ENVIRONMENT-backups/data-$DATE/ \
      --delete
    
    # Configuration backup
    echo "Backing up configuration..."
    kubectl get configmaps -n tco-calculator-$ENVIRONMENT -o yaml > \
      "/tmp/configmaps-$ENVIRONMENT-$DATE.yaml"
    
    aws s3 cp "/tmp/configmaps-$ENVIRONMENT-$DATE.yaml" \
      "s3://tco-calculator-$ENVIRONMENT-backups/config/"
    
    echo "Full backup completed: $DATE"
    ;;
    
  "database")
    echo "Performing database-only backup..."
    aws rds create-db-snapshot \
      --db-instance-identifier "tco-calculator-$ENVIRONMENT-db" \
      --db-snapshot-identifier "tco-calculator-$ENVIRONMENT-db-backup-$DATE"
    ;;
    
  "restore")
    RESTORE_DATE=${3:-latest}
    echo "Restoring from backup: $RESTORE_DATE"
    
    if [ "$RESTORE_DATE" = "latest" ]; then
      SNAPSHOT_ID=$(aws rds describe-db-snapshots \
        --db-instance-identifier "tco-calculator-$ENVIRONMENT-db" \
        --query 'DBSnapshots[0].DBSnapshotIdentifier' \
        --output text)
    else
      SNAPSHOT_ID="tco-calculator-$ENVIRONMENT-backup-$RESTORE_DATE"
    fi
    
    echo "Restoring from snapshot: $SNAPSHOT_ID"
    
    # Scale down application
    kubectl scale deployment/tco-calculator-api \
      --replicas=0 -n tco-calculator-$ENVIRONMENT
    
    # Restore database
    aws rds restore-db-instance-from-db-snapshot \
      --db-instance-identifier "tco-calculator-$ENVIRONMENT-db-restored" \
      --db-snapshot-identifier "$SNAPSHOT_ID"
    
    echo "Database restore initiated. Please update connection strings and scale up application."
    ;;
    
  *)
    echo "Usage: $0 <environment> <full|database|restore> [restore_date]"
    exit 1
    ;;
esac
```

This comprehensive deployment architecture provides a robust, scalable, and maintainable infrastructure for the Immersion Cooling TCO Calculator, supporting high availability, disaster recovery, and operational excellence in production environments.