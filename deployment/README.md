# DoubleZero Infrastructure

This directory contains Terraform code to deploy the DoubleZero infrastructure on AWS. The infrastructure consists of a Web Application Firewall (WAF), API Gateway, Load Balancer, and EC2 instances with auto-scaling capabilities.

## Architecture

The infrastructure follows a layered architecture:

1. **WAF (Web Application Firewall)** - Protects the application from common web exploits and attacks.
2. **API Gateway** - Serves as the entry point for all client requests, providing a unified interface.
3. **Load Balancer** - Distributes traffic across multiple EC2 instances for high availability and scalability.
4. **EC2 Instances** - Run the application code, with auto-scaling to handle varying loads.

## Multi-Level Organization

The infrastructure is organized into three levels:

1. **Account Level**: Resources that are shared across all regions and environments (IAM roles, policies, etc.)
2. **Regional Level**: Resources that are specific to a region but shared across environments (VPC, WAF, etc.)
3. **Environment Level**: Resources that are specific to an environment (EC2 instances, etc.)

## Directory Structure

```
deployment/
├── account/                # Account-level Terraform resources
│   ├── main.tf             # Main Terraform configuration
│   ├── variables.tf        # Input variables
│   └── outputs.tf          # Output values
├── regional/               # Regional-level Terraform resources
│   ├── main.tf             # Main Terraform configuration
│   ├── variables.tf        # Input variables
│   └── outputs.tf          # Output values
├── environments/           # Environment-specific Terraform resources
│   ├── main.tf             # Main Terraform configuration
│   ├── variables.tf        # Input variables
│   ├── outputs.tf          # Output values
│   ├── terraform.tfvars    # Variable values
│   └── templates/          # Terraform template files
│       └── backend_config.tf.template
├── modules/                # Reusable Terraform modules
│   ├── vpc/                # VPC module
│   ├── waf/                # WAF module
│   ├── api_gateway/        # API Gateway module
│   ├── load_balancer/      # Load Balancer module
│   └── ec2/                # EC2 module with auto-scaling
└── script/                 # DevOps deployment and management scripts
    ├── common.sh           # Common functions and utilities
    ├── one_time_setup.sh   # Initial AWS infrastructure setup
    ├── release.sh          # Artifact publishing and deployment
    ├── env_creation.sh     # Environment creation and destruction
    ├── deploy_update.sh    # Service deployment and updates
    ├── script.py           # Python utility for Solana keypair management
    └── templates/          # Script template files
        └── s3_backend_acl_policy.json.template
```


## Prerequisites

- **Terraform** (v1.0.0 or later)
- **AWS CLI** configured with appropriate credentials
- **Docker** installed and configured
- **Python 3** with pip (for keypair management)
- **Base64 utility** available on the system
- **AWS IAM permissions** for:
   - ECR (Elastic Container Registry)
   - EC2 instances and Auto Scaling Groups
   - SSM (Systems Manager)
   - S3 (for Terraform state)
   - CloudWatch Logs
   - Parameter Store

## Quick Start Guide

### 1. Initial Setup (One-Time)

Before deploying any environments, configure the AWS foundation:

```bash
# Navigate to the script directory
cd deployment/script

# Run one-time setup for your target region
./one_time_setup.sh us-east-1
```
**What this does:**
- Creates Terraform state S3 bucket: `doublezero-terraform-state-{account-id}`
- Configures bucket security settings (versioning, KMS encryption, access blocking)
- Sets up IAM policies and resource tagging for governance

### 2. Account-Level Infrastructure Setup
Deploy account-level resources that are shared across all regions:

```shell
# Create account-level infrastructure
./account_creation.sh create --region us-east-1
# Or with auto-approval and specific region
./account_creation.sh create --auto-approve --region us-east-1
``` 

**What this creates:**
- Shared IAM roles and policies
- Cross-region security configurations
- Account-wide governance settings
- Global resource tags and naming conventions

### 3. Regional Infrastructure Setup

Deploy regional-level resources for your target region:
```bash
# Create regional infrastructure for us-east-1
./regional_creation.sh create --region us-east-1
# Or with auto-approval
./regional_creation.sh create --region us-east-1 --auto-approve
``` 

**What this creates:**
- VPC and networking infrastructure
- Regional security groups and NACLs
- NAT gateways and internet gateways
- Regional WAF configurations
- Load balancer infrastructure
- Regional ECR repositories

### 4. Publish Artifacts
**Before creating any environment, you must publish the service artifacts:**
```shell
# Publish artifacts with a release tag
./release.sh publish-artifacts --region us-east-1 --release-tag v3.0.0-nightly
```


### 5. Create New Environment
After publishing artifacts, create a complete new environment:
```shell
# Create environment using the published release tag
./env_creation.sh create --env dev-test --release-tag v3.0.0-nightly --region us-east-1
```

### 6. Update Existing Environment
For updating an existing environment with a new release:

```shell
# Publish new artifacts and upgrade environment in one command
./release.sh publish-artifacts-and-upgrade --region us-east-1 --release-tag v3.0.2-nightly --env dev-test
```

## Deployment Scripts Reference
### Core Scripts
#### `one_time_setup.sh`
**Purpose**: Initialize AWS foundation infrastructure
``` bash
./one_time_setup.sh <aws-region>

# Example
./one_time_setup.sh us-east-1
```
**Features:**
- Creates secure S3 backend for Terraform state
- Configures proper IAM policies and encryption
- Sets up resource tagging for cost management

#### `release.sh`
**Purpose**: Artifact publishing and deployment management
``` bash
# Publish artifacts only (required before creating environments)
./release.sh publish-artifacts --region <region> --release-tag <tag> 

# Deploy to existing environment
./release.sh upgrade --region <region> --release-tag <tag> --env <environment> 

# Publish and deploy in one command
./release.sh publish-artifacts-and-upgrade --region <region> --release-tag <tag> --env <environment>

# Examples
./release.sh publish-artifacts --region us-east-1 --release-tag v3.0.0-nightly
./release.sh upgrade --region us-east-1 --release-tag v3.0.0-nightly --env dev-test 
./release.sh publish-artifacts-and-upgrade --region us-east-1 --release-tag v3.0.2-nightly --env dev-test
```

**Features:**
- Automated ECR integration and image verification
- Health checks and deployment monitoring
- Comprehensive error handling and rollback capabilities

#### `env_creation.sh`
**Purpose**: Create and manage complete environments
``` bash
# Create environment (artifacts must be published first)
./env_creation.sh create --env <environment> --release-tag <tag> --region <region> [--auto-approve]

# Destroy environment
./env_creation.sh destroy --env <environment> --release-tag <tag> --region <region> [--auto-approve]

# Examples
./env_creation.sh create --env dev-test --release-tag v3.0.0-nightly --region us-east-1
./env_creation.sh destroy --env staging --release-tag v2.8.5 --region us-west-2 --auto-approve
```
**Features:**
- Dynamic Terraform backend configuration
- Environment validation and safety checks
- Interactive approval process (unless auto-approve specified)
- Complete infrastructure lifecycle management


## Deployment Strategies
### Strategy 1: Complete New Environment Setup
``` bash
# 1. Initial setup (if not done)
./one_time_setup.sh us-east-1

# 2. Account level resource creation
 ./account_creation.sh --action create --region us-east-1
 
# 3. Regional Lvevel resource creation
 ./regional_creation.sh --action create --region us-east-1

# 4. Publish artifacts FIRST
./release.sh --action publish-artifacts --region us-east-1 --release-tag v3.0.0-nightly

# 5. Create environment using published artifacts
./env_creation.sh --action create --env dev-test --release-tag v3.0.0-nightly --region us-east-1
```
### Strategy 2: Update Existing Environment
``` bash
# Single command for publish and deploy to existing environment
./release.sh --action publish-artifacts-and-upgrade --region us-east-1 --release-tag v3.0.2-nightly --env dev-test
```
### Strategy 3: Staged Deployment
``` bash
# 1. Publish artifacts first
./release.sh --action publish-artifacts --region us-east-1 --release-tag v3.0.2-nightly

# 2. Deploy to specific services as needed
./release.sh --action upgrade --region us-east-1 --release-tag v3.0.2-nightly --env dev-test --service-name swap-oracle-service
```

## Solana Keypair Management
The deployment includes a Python utility for managing Solana keypairs:
### Installation
``` bash
pip install solders base58
```
### Usage
#### Generate New Keypair
``` bash
cd deployment/script
python3 script.py
```
#### Load Existing Keypair
``` bash
python3 script.py <keypair.json>
```
**Features:**
- Generates secure Solana keypairs
- Base58 encoding for AWS Parameter Store integration
- JSON file support for existing keypairs
### Parameter Store Integration
Update AWS Parameter Store with the Base58 encoded secret key for secure storage and retrieval.

## Important Deployment Order
⚠️ **Critical**: Always follow this order for new environments:
1. **One-time setup** (if not done): `./one_time_setup.sh us-east-1`
2. **Publish artifacts**: `./release.sh publish-artifacts --region us-east-1 --release-tag v3.0.0-nightly`
3. **Create environment**: `./env_creation.sh create --env dev-test --release-tag v3.0.0-nightly --region us-east-1`

**Why this order matters:**
- Environment creation expects the Docker images to exist in ECR with the specified release tag
- Publishing artifacts builds and pushes the Docker images to ECR
- The Terraform configuration references these images during infrastructure provisioning

## Security and Best Practices
### Infrastructure Security
- **Encrypted State**: Terraform state stored with KMS encryption in S3
- **Access Control**: IAM least-privilege access patterns
- **Resource Tagging**: Comprehensive tagging for governance and cost tracking
- **Network Security**: EC2 instances in private subnets with security groups

### Container Security
- **ECR Integration**: Secure container registry with AWS authentication
- **Image Verification**: Pre-deployment validation of container images
- **Centralized Logging**: CloudWatch integration for all services

### Operational Excellence
- **Semantic Versioning**: Consistent release tag format enforcement
- **Environment Progression**: Recommended dev → staging → prod workflow
- **Monitoring**: Comprehensive deployment status tracking and health checks
- **Rollback Capabilities**: Automatic rollback for failed deployments

## Troubleshooting
### Common Issues and Solutions
#### Artifact Publishing Issues
- **Missing Docker Images**: Ensure `publish-artifacts` command completed successfully before creating environments
- **ECR Authentication**: Verify AWS credentials have ECR push/pull permissions
- **Build Failures**: Check the off-chain service directories exist and build scripts are executable

#### Environment Creation Issues
- **Missing Release Tag**: Verify the release tag exists in ECR using `aws ecr list-images`
- **Terraform Backend**: Ensure one-time setup completed successfully
- **Resource Conflicts**: Use unique environment names to avoid naming conflicts

#### Deployment Failures
- **Instance Connectivity**: Verify SSM agent is running on target EC2 instances
- **Service Health**: Check CloudWatch logs for application-specific issues
- **Container Issues**: Verify container starts successfully with the specified image tag


## Modules

### VPC Module

Creates a VPC with public and private subnets, internet gateway, NAT gateway, and security groups.

### WAF Module

Creates a Web Application Firewall with AWS managed rule sets and custom rules.

### API Gateway Module

Creates an HTTP API Gateway with routes, integrations, and logging.

### Load Balancer Module

Creates an Application Load Balancer with target groups, listeners, and health checks.

### EC2 Module

Creates EC2 instances with auto-scaling, launch templates, IAM roles, and CloudWatch alarms.

### Getting Help

For additional help or to report issues, please contact the infrastructure team.
