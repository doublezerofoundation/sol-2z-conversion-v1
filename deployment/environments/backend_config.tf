# Configuring backend to use S3 to backup tfstate
terraform {
  backend "s3" {
    bucket         = "doublezero-terraform-state-855800749107"
    key            = "us-east-1/environments/demo1/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}