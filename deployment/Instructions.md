## Overview

The `publish_and_deploy.sh` script provides three main operations:
- **publish**: Build and publish Docker image to Amazon ECR
- **deploy**: Deploy existing image to EC2 instances
- **publish-and-deploy**: Complete pipeline (build, publish, and deploy)

## Prerequisites

- AWS CLI installed and configured
- Docker installed and running
- Appropriate AWS permissions for ECR and EC2/SSM operations
- Target EC2 instances tagged with the specified environment

## Usage

```bash
./publish_and_deploy.sh COMMAND [OPTIONS]
```
COMMAND - publish, deploy, publish-and-deploy

OPTIONS - `--env ENV --region REGION --image-tag TAG --service-name NAME --ecr-repository REP`








eg 
```shell
 ./publish_and_deploy.sh publish-and-deploy  --env dev3 --region us-east-1 --image-tag v1.3.0  --ecr-repository double-zero-oracle-pricing-service  --service-name swap-oracle-service

```
