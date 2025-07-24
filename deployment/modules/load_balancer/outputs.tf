# Outputs for Network Load Balancer Module

output "load_balancer_id" {
  description = "The ID of the Network Load Balancer"
  value       = aws_lb.this.id
}

output "load_balancer_arn" {
  description = "The ARN of the Network Load Balancer"
  value       = aws_lb.this.arn
}

output "load_balancer_dns" {
  description = "The DNS name of the Network Load Balancer"
  value       = aws_lb.this.dns_name
}

output "load_balancer_zone_id" {
  description = "The canonical hosted zone ID of the Network Load Balancer"
  value       = aws_lb.this.zone_id
}

output "target_group_arn" {
  description = "The ARN of the TCP target group"
  value       = aws_lb_target_group.http.arn
}

output "target_group_name" {
  description = "The name of the TCP target group"
  value       = aws_lb_target_group.http.name
}

output "http_listener_arn" {
  description = "The ARN of the TCP listener"
  value       = aws_lb_listener.http.arn
}
