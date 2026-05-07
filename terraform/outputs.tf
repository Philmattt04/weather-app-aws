output "api_gateway_base_url" {
  description = "Base URL for all API calls — set this as API_GATEWAY_URL in your .env.local"
  value       = aws_api_gateway_stage.prod.invoke_url
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.weather_records.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.weather_records.arn
}

output "lambda_role_arn" {
  description = "IAM role ARN shared by all Lambda functions"
  value       = aws_iam_role.lambda_exec.arn
}
