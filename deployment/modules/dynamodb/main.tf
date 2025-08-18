locals {
  common_tags = merge(
    { Environment = var.environment }
  )
}

# system-state
resource "aws_dynamodb_table" "system_state" {
  name         = "${var.name_prefix}-system-state"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "key"

  attribute {
    name = "key"
    type = "S"
  }
  attribute {
    name = "value"
    type = "S"
  }

  global_secondary_index {
    name            = "value_idx"
    hash_key        = "value"
    projection_type = "ALL"
  }

  tags = local.common_tags
}

# solana-event
resource "aws_dynamodb_table" "solana_event" {
  name         = "${var.name_prefix}-solana-event"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "tx_hash"
  range_key = "event_id"

  attribute {
    name = "tx_hash"
    type = "S"
  }
  attribute {
    name = "event_id"
    type = "S"
  }
  attribute {
    name = "event_type"
    type = "S"
  }
  attribute {
    name = "slot"
    type = "N"
  }
  attribute {
    name = "timestamp"
    type = "N"
  }

  global_secondary_index {
    name            = "event_type_timestamp_idx"
    hash_key        = "event_type"
    range_key       = "timestamp"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "event_type_slot_idx"
    hash_key        = "event_type"
    range_key       = "slot"
    projection_type = "ALL"
  }

  tags = local.common_tags
}

# solana-error
resource "aws_dynamodb_table" "solana_error" {
  name         = "${var.name_prefix}-solana-error"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "tx_hash"

  attribute {
    name = "tx_hash"
    type = "S"
  }
  attribute {
    name = "error_code"
    type = "S"
  }
  attribute {
    name = "slot"
    type = "N"
  }
  attribute {
    name = "timestamp"
    type = "N"
  }

  global_secondary_index {
    name            = "error_code_timestamp_idx"
    hash_key        = "error_code"
    range_key       = "timestamp"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "timestamp_idx"
    hash_key        = "timestamp"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "slot_timestamp_idx"
    hash_key        = "slot"
    range_key       = "timestamp"
    projection_type = "ALL"
  }
  tags = local.common_tags
}

# fill-dequeue
resource "aws_dynamodb_table" "fill_dequeue" {
  name         = "${var.name_prefix}-fill-dequeue"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "tx_hash"
  range_key = "timestamp"

  attribute {
    name = "tx_hash"
    type = "S"
  }
  attribute {
    name = "timestamp"
    type = "N"
  }
  attribute {
    name = "requester"
    type = "S"
  }
  attribute {
    name = "sol_dequeued"
    type = "N"
  }

  global_secondary_index {
    name            = "requester_timestamp_idx"
    hash_key        = "requester"
    range_key       = "timestamp"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "timestamp_idx"
    hash_key        = "timestamp"
    projection_type = "ALL"
  }
   global_secondary_index {
    name            = "sol_dequeued_timestamp_idx"
    hash_key        = "sol_dequeued"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  tags = local.common_tags
}

# deny-list-action
resource "aws_dynamodb_table" "deny_list_action" {
  name         = "${var.name_prefix}-deny-list-action"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "tx_hash"
  range_key = "timestamp"

  attribute {
    name = "tx_hash"
    type = "S"
  }
  attribute {
    name = "timestamp"
    type = "N"
  }
  attribute {
    name = "address"
    type = "S"
  }
  attribute {
    name = "action_type"
    type = "S"
  }
  attribute {
    name = "action_by"
    type = "S"
  }
  attribute {
    name = "update_count"
    type = "N"
  }

  global_secondary_index {
    name            = "address_timestamp_idx"
    hash_key        = "address"
    range_key       = "timestamp"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "action_type_timestamp_idx"
    hash_key        = "action_type"
    range_key       = "timestamp"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "timestamp_idx"
    hash_key        = "timestamp"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "update_count_by_timestamp_idx"
    hash_key        = "update_count"
    range_key       = "timestamp"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "action_by_timestamp_idx"
    hash_key        = "action_by"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  tags = local.common_tags
}
