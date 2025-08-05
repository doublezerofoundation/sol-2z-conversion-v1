output "solana_event_table_name" {
  description = "Name of the solana-event DynamoDB table"
  value       = aws_dynamodb_table.solana_event.name
}

output "solana_error_table_name" {
  description = "Name of the solana-error DynamoDB table"
  value       = aws_dynamodb_table.solana_error.name
}

output "fill_dequeue_table_name" {
  description = "Name of the fill-dequeue DynamoDB table"
  value       = aws_dynamodb_table.fill_dequeue.name
}

output "deny_list_action_table_name" {
  description = "Name of the deny-list-action DynamoDB table"
  value       = aws_dynamodb_table.deny_list_action.name
}
