# Deployment and Key Management Guide

## 1. Docker Deployment Script

### Overview
The `publish_and_deploy.sh` script provides three main operations:
- **publish**: Build and publish Docker image to Amazon ECR
- **deploy**: Deploy existing image to EC2 instances
- **publish-and-deploy**: Complete pipeline (build, publish, and deploy)

### Prerequisites
- AWS CLI installed and configured
- Docker installed and running
- Appropriate AWS permissions for ECR and EC2/SSM operations
- Target EC2 instances tagged with the specified environment

### Usage
```bash
./publish_and_deploy.sh COMMAND [OPTIONS]
```

**Parameters:**
- `COMMAND`: `publish`, `deploy`, or `publish-and-deploy`
- `OPTIONS`: `--env ENV --region REGION --image-tag TAG --service-name NAME --ecr-repository REP`

**Example:**
```bash
./publish_and_deploy.sh publish-and-deploy \
  --env dev3 \
  --region us-east-1 \
  --image-tag v1.3.0 \
  --ecr-repository double-zero-oracle-pricing-service \
  --service-name swap-oracle-service
```

## 2. Solana Keypair Management

### Overview
A Python script for managing Solana keypairs and storing secret keys in AWS Parameter Store.

### Installation
```bash
pip install solders base58
```

### Usage

#### Create New Keypair
```bash
python3 script.py
```
- Generates a new random Solana keypair
- Displays the public key and Base58 secret key
- Option to save to JSON file

#### Load Existing Keypair
```bash
python3 script.py <keypair.json>
```
- Loads an existing keypair from JSON file
- Extracts the public key and Base58 secret key

### Output
Both commands display:
- Public Key
- Base58 Secret Key

### Parameter Store Integration
Update AWS Parameter Store with the Base58 encoded secret key for secure storage and retrieval.

