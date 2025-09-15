# Configuring backend to use S3 to backup tfstate
terraform {
  backend "s3" {
    bucket         = "doublezero-terraform-state-879381273509"
    key            = "regional/us-east-1/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}

