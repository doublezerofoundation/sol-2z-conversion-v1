output "parameter_name" {
  value = aws_ssm_parameter.oracle-key.name
}

output "ssm_arn" {
  value = aws_ssm_parameter.oracle-key.arn
}