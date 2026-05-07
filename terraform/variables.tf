variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Prefix used for all named resources"
  type        = string
  default     = "weather-app"
}

variable "stage_name" {
  description = "API Gateway deployment stage"
  type        = string
  default     = "prod"
}

variable "lambda_runtime" {
  description = "Lambda runtime — Node 20 includes AWS SDK v3 and native fetch"
  type        = string
  default     = "nodejs20.x"
}

variable "openweather_api_key" {
  description = "OpenWeatherMap API key (injected as Lambda env var)"
  type        = string
  sensitive   = true
}

variable "youtube_api_key" {
  description = "YouTube Data API v3 key (injected as Lambda env var)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock model ID for AI insights"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}
