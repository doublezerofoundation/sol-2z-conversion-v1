# Outputs for EC2 Module

output "launch_template_id" {
  description = "The ID of the Launch Template"
  value       = aws_launch_template.this.id
}

output "launch_template_arn" {
  description = "The ARN of the Launch Template"
  value       = aws_launch_template.this.arn
}

output "launch_template_latest_version" {
  description = "The latest version of the Launch Template"
  value       = aws_launch_template.this.latest_version
}

output "asg_id" {
  description = "The ID of the Auto Scaling Group"
  value       = aws_autoscaling_group.this.id
}

output "asg_name" {
  description = "The name of the Auto Scaling Group"
  value       = aws_autoscaling_group.this.name
}

output "asg_arn" {
  description = "The ARN of the Auto Scaling Group"
  value       = aws_autoscaling_group.this.arn
}

output "iam_role_name" {
  description = "The name of the IAM role for EC2 instances"
  value       = aws_iam_role.ec2_role.name
}

output "iam_role_arn" {
  description = "The ARN of the IAM role for EC2 instances"
  value       = aws_iam_role.ec2_role.arn
}

output "instance_profile_name" {
  description = "The name of the IAM instance profile for EC2 instances"
  value       = aws_iam_instance_profile.ec2_profile.name
}

output "instance_profile_arn" {
  description = "The ARN of the IAM instance profile for EC2 instances"
  value       = aws_iam_instance_profile.ec2_profile.arn
}

output "scale_up_policy_arn" {
  description = "The ARN of the scale up policy"
  value       = aws_autoscaling_policy.scale_up.arn
}

output "scale_down_policy_arn" {
  description = "The ARN of the scale down policy"
  value       = aws_autoscaling_policy.scale_down.arn
}

output "high_cpu_alarm_id" {
  description = "The ID of the high CPU alarm"
  value       = aws_cloudwatch_metric_alarm.high_cpu.id
}

output "low_cpu_alarm_id" {
  description = "The ID of the low CPU alarm"
  value       = aws_cloudwatch_metric_alarm.low_cpu.id
}

# output "user_data_template_path" {
#   description = "The path to the user data template file"
#   value       = local_file.user_data_template.filename
# }