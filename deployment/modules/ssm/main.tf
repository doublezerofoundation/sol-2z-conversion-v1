resource "aws_ssm_parameter" "oracle-key" {
  name  = var.name
  type  = var.type
  value = var.value
  tags  = var.tags
}