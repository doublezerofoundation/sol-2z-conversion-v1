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
├── account/                # Account-level resources
│   ├── main.tf             # Main Terraform configuration
│   ├── variables.tf        # Input variables
│   └── outputs.tf          # Output values
├── regional/               # Regional-level resources
│   ├── main.tf             # Main Terraform configuration
│   ├── variables.tf        # Input variables
│   └── outputs.tf          # Output values
├── environments/           # Environment-specific resources
│   ├── dev/                # Development environment
│   │   ├── main.tf         # Main Terraform configuration
│   │   ├── variables.tf    # Input variables
│   │   ├── outputs.tf      # Output values
│   │   └── terraform.tfvars # Variable values
│   ├── staging/            # Staging environment (create as needed)
│   └── prod/               # Production environment (create as needed)
└── modules/                # Reusable modules
    ├── vpc/                # VPC module
    ├── waf/                # WAF module
    ├── api_gateway/        # API Gateway module
    ├── load_balancer/      # Load Balancer module
    └── ec2/                # EC2 module with auto-scaling
```

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) (v1.0.0 or later)
- AWS CLI configured with appropriate credentials
- S3 bucket for Terraform state called doublezero-terraform-state-bucket  (optional, for remote state)
- DynamoDB Table for Terraform lock called doublezero-terraform-locks with partition key LockID (string) (optional, for remote state)

## Usage

The infrastructure should be deployed in the following order:

1. Account-level resources
2. Regional-level resources
3. Environment-level resources

### Account-Level Deployment

```bash
# Navigate to the account directory
cd deployment/account

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the changes
terraform apply
```

### Regional-Level Deployment

```bash
# Navigate to the regional directory
cd deployment/regional

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the changes
terraform apply
```

### Environment-Level Deployment

```bash
# Navigate to the environment directory
cd deployment/environments/dev

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the changes
terraform apply
```

### Destroying Infrastructure

To destroy the infrastructure, follow the reverse order:

1. Environment-level resources
2. Regional-level resources
3. Account-level resources

```bash
# Destroy environment-level resources
cd deployment/environments/dev
terraform destroy

# Destroy regional-level resources
cd ../../regional
terraform destroy

# Destroy account-level resources
cd ../account
terraform destroy
```

## Environment Configuration

Each environment (dev, staging, prod) has its own directory under `environments/` with its own Terraform configuration files and variable values.

### Example: Creating a New Environment

1. Create a new directory for the environment:

```bash
mkdir -p deployment/environments/staging
```

2. Copy the Terraform configuration files from an existing environment:

```bash
cp deployment/environments/dev/main.tf deployment/environments/staging/
cp deployment/environments/dev/variables.tf deployment/environments/staging/
cp deployment/environments/dev/outputs.tf deployment/environments/staging/
cp deployment/environments/dev/terraform.tfvars deployment/environments/staging/
```

3. Edit the `terraform.tfvars` file to set appropriate values for the staging environment:

```bash
# Update environment name
environment = "staging"

# Update other environment-specific values as needed
instance_type = "t3.small"  # Example: use larger instances in staging
asg_min_size = 2
asg_max_size = 10
asg_desired_capacity = 3
```

4. Deploy the new environment:

```bash
# Deploy account-level resources (if not already deployed)
cd deployment/account
terraform init
terraform apply

# Deploy regional-level resources (if not already deployed)
cd ../regional
terraform init
terraform apply -var-file=../environments/staging/terraform.tfvars

# Deploy environment-level resources
cd ../environments/staging
terraform init
terraform apply
```

## Remote State and Data Sources

Each level of the infrastructure uses a separate remote state file in the S3 bucket:

- Account level: `account/terraform.tfstate`
- Regional level: `regional/terraform.tfstate`
- Environment level: `environments/dev/terraform.tfstate` (and similar for other environments)

The regional and environment levels use data sources to access the outputs from the account level:

```terraform
# Data source to get account-level outputs
data "terraform_remote_state" "account" {
  backend = "s3"
  config = {
    bucket         = "doublezero-terraform-state-bucket"
    key            = "account/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}

# Example: Using account-level outputs
resource "example_resource" "example" {
  instance_profile_name = data.terraform_remote_state.account.outputs.ec2_instance_profile_name
}
```

The environment level also uses data sources to access the outputs from the regional level:

```terraform
# Data source to get regional-level outputs
data "terraform_remote_state" "regional" {
  backend = "s3"
  config = {
    bucket         = "doublezero-terraform-state-bucket"
    key            = "regional/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}

# Example: Using regional-level outputs
resource "example_resource" "example" {
  vpc_id = data.terraform_remote_state.regional.outputs.vpc_id
}
```

This approach allows each level to be managed independently while still being able to reference resources from other levels.

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

## Customization

### Adding Custom Rules to WAF

Edit the `modules/waf/main.tf` file to add custom rules to the WAF Web ACL.

### Modifying Auto-Scaling Policies

Edit the `modules/ec2/main.tf` file to modify the auto-scaling policies and alarms.

### Changing Health Check Settings

Edit the `modules/load_balancer/main.tf` file to modify the health check settings.

## Outputs

After applying the Terraform configuration, various outputs will be displayed, including:

- VPC ID and subnet IDs
- WAF Web ACL ID and ARN
- API Gateway endpoint URL
- Load Balancer DNS name
- Auto Scaling Group name

These outputs can be used to access and manage the deployed resources.

## Security Considerations

- The WAF is configured with AWS managed rule sets for common vulnerabilities.
- EC2 instances are placed in private subnets for enhanced security.
- Security groups are configured with least privilege access.
- HTTPS can be enabled by providing a certificate ARN in the environment configuration.

## Monitoring and Logging

- CloudWatch alarms are configured for the Load Balancer and EC2 instances.
- API Gateway and WAF logs are sent to CloudWatch Logs.
- EC2 instances have the CloudWatch agent installed for system and application monitoring.

## Troubleshooting

### Common Issues

1. **Terraform initialization fails**:
   - Ensure AWS credentials are properly configured.
   - Check S3 bucket permissions if using remote state.

2. **Resource creation fails**:
   - Check AWS service quotas.
   - Verify subnet availability in the selected availability zones.

3. **Health checks fail**:
   - Verify security group rules allow health check traffic.
   - Check the health check path and port configuration.

### Getting Help

For additional help or to report issues, please contact the infrastructure team.
