output "topic_arn" { 
  value = aws_sns_topic.app_errors.arn 
}

output "topic_name" { 
  value = aws_sns_topic.app_errors.name 
}
