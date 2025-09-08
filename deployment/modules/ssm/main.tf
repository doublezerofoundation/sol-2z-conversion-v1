# Create parameter only if it doesn't exist
resource "aws_ssm_parameter" "oracle-key" {
  name  = var.name
  type  = var.type
  value = var.value
  tags  = var.tags

  lifecycle {
    ignore_changes = [value]
  }

}
