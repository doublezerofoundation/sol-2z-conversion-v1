output "system_state_table_name" {
  description = "Name of the system state DynamoDB table"
  value       = aws_dynamodb_table.system_state.name
}

output "system_state_table_arn" {
  description = "ARN of the system state DynamoDB table"
  value       = aws_dynamodb_table.system_state.arn
}

output "solana_event_table_name" {
  description = "Name of the solana-event DynamoDB table"
  value       = aws_dynamodb_table.solana_event.name
}

output "solana_event_table_arn" {
  description = "ARN of the solana-event DynamoDB table"
  value       = aws_dynamodb_table.solana_event.arn
}

output "fill_dequeue_table_name" {
  description = "Name of the fill-dequeue DynamoDB table"
  value       = aws_dynamodb_table.fill_dequeue.name
}

output "fill_dequeue_table_arn" {
  description = "ARN of the fill-dequeue DynamoDB table"
  value       = aws_dynamodb_table.fill_dequeue.arn
}

output "deny_list_action_table_name" {
  description = "Name of the deny-list-action DynamoDB table"
  value       = aws_dynamodb_table.deny_list_action.name
}

output "deny_list_action_table_arn" {
  description = "ARN of the deny-list-action DynamoDB table"
  value       = aws_dynamodb_table.deny_list_action.arn
}

# All table ARNs for easy Lambda permissions
output "all_table_arns" {
  description = "List of all DynamoDB table ARNs"
  value = [
    aws_dynamodb_table.system_state.arn,
    aws_dynamodb_table.solana_event.arn,
    aws_dynamodb_table.fill_dequeue.arn,
    aws_dynamodb_table.deny_list_action.arn
  ]
}
