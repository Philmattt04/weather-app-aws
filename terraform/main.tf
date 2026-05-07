terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Uncomment to store state remotely in S3
  # backend "s3" {
  #   bucket = "your-tf-state-bucket"
  #   key    = "weather-app/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

# Zip each Lambda function directory at plan time
data "archive_file" "records_list" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/records-list"
  output_path = "${path.module}/../lambda/records-list.zip"
}

data "archive_file" "records_create" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/records-create"
  output_path = "${path.module}/../lambda/records-create.zip"
}

data "archive_file" "records_get" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/records-get"
  output_path = "${path.module}/../lambda/records-get.zip"
}

data "archive_file" "records_update" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/records-update"
  output_path = "${path.module}/../lambda/records-update.zip"
}

data "archive_file" "records_delete" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/records-delete"
  output_path = "${path.module}/../lambda/records-delete.zip"
}

# records-export needs pdfkit — run `npm install` in that directory first
data "archive_file" "records_export" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/records-export"
  output_path = "${path.module}/../lambda/records-export.zip"
}

data "archive_file" "ai_insights" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/ai-insights"
  output_path = "${path.module}/../lambda/ai-insights.zip"
}
