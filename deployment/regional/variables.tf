variable "oracle_pricing_key" {
  description = "Admin keypair for SSM parameter"
  type        = string
  default     = "Secret base 58 encoded admin kaypair string"
}


variable "ecr_repository_name" {
  description = "Name of the ECR repository"
  type        = string
  default     = "double-zero-repository"
}

variable "ecr_image_tag_mutability" {
  description = "Image tag mutability setting for ECR repository"
  type        = string
  default     = "MUTABLE"
  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.ecr_image_tag_mutability)
    error_message = "Image tag mutability must be either MUTABLE or IMMUTABLE."
  }
}

variable "ecr_scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "ecr_encryption_type" {
  description = "Encryption type for ECR repository"
  type        = string
  default     = "AES256"
  validation {
    condition     = contains(["AES256", "KMS"], var.ecr_encryption_type)
    error_message = "Encryption type must be either AES256 or KMS."
  }
}

variable "ecr_kms_key_arn" {
  description = "KMS key ARN for ECR repository encryption (required if encryption_type is KMS)"
  type        = string
  default     = null
}

variable "ecr_tags" {
  description = "Tags to apply to ECR repository"
  type        = map(string)
  default = {
    Name = "double-zero-repository"
  }
}