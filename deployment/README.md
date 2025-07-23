# DoubleZero Infrastructure

This directory contains Terraform code to deploy the DoubleZero infrastructure on AWS. The infrastructure consists of a Web Application Firewall (WAF), API Gateway, Load Balancer, and EC2 instances with auto-scaling capabilities.

## Architecture

The infrastructure follows a layered architecture:

1. **WAF (Web Application Firewall)** - Protects the application from common web exploits and attacks.
2. **API Gateway** - Serves as the entry point for all client requests, providing a unified interface.
3. **Load Balancer** - Distributes traffic across multiple EC2 instances for high availability and scalability.
4. **EC2 Instances** - Run the application code, with auto-scaling to handle varying loads.

## Directory Structure

```
deployment/
├── main.tf                 # Main Terraform configuration
├── variables.tf            # Variable definitions
├── outputs.tf              # Output definitions
├── environments/           # Environment-specific configurations
│   ├── dev/                # Development environment
│   │   └── terraform.tfvars # Development environment variables
│   ├── staging/            # Staging environment (create as needed)
│   └── prod/               # Production environment (create as needed)
└── modules/                # Terraform modules
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

### Initialize Terraform

```bash
cd deployment
terraform init
```

If using remote state with S3:

```bash
terraform init \
  -backend-config="bucket=your-terraform-state-bucket" \
  -backend-config="key=doublezero/terraform.tfstate" \
  -backend-config="region=us-east-1"
```

### Select Environment

To use a specific environment configuration:

```bash
terraform plan -var-file=environments/dev/terraform.tfvars
```

### Apply Changes

```bash
terraform apply -var-file=environments/dev/terraform.tfvars
```

### Destroy Infrastructure

```bash
terraform destroy -var-file=environments/dev/terraform.tfvars
```

## Environment Configuration

Each environment (dev, staging, prod) can have its own configuration in the `environments/` directory. Create a `terraform.tfvars` file for each environment with appropriate values.

### Example: Creating a New Environment

1. Create a new directory for the environment:

```bash
mkdir -p environments/staging
```

2. Create a `terraform.tfvars` file with environment-specific values:

```bash
cp environments/dev/terraform.tfvars environments/staging/terraform.tfvars
```

3. Edit the `terraform.tfvars` file to set appropriate values for the staging environment.

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