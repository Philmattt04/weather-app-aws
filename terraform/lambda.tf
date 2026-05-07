locals {
  table_name = aws_dynamodb_table.weather_records.name
  common_env = {
    DYNAMODB_TABLE = local.table_name
    APP_REGION     = var.aws_region
  }
}

# ── CloudWatch log groups (14-day retention) ──────────────────────────────────

resource "aws_cloudwatch_log_group" "records_list" {
  name              = "/aws/lambda/${var.app_name}-records-list"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "records_create" {
  name              = "/aws/lambda/${var.app_name}-records-create"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "records_get" {
  name              = "/aws/lambda/${var.app_name}-records-get"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "records_update" {
  name              = "/aws/lambda/${var.app_name}-records-update"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "records_delete" {
  name              = "/aws/lambda/${var.app_name}-records-delete"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "records_export" {
  name              = "/aws/lambda/${var.app_name}-records-export"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "ai_insights" {
  name              = "/aws/lambda/${var.app_name}-ai-insights"
  retention_in_days = 14
}

# ── Lambda functions ──────────────────────────────────────────────────────────

resource "aws_lambda_function" "records_list" {
  function_name    = "${var.app_name}-records-list"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = var.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.records_list.output_path
  source_code_hash = data.archive_file.records_list.output_base64sha256
  timeout          = 15
  environment { variables = local.common_env }
  depends_on = [aws_cloudwatch_log_group.records_list]
}

resource "aws_lambda_function" "records_create" {
  function_name    = "${var.app_name}-records-create"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = var.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.records_create.output_path
  source_code_hash = data.archive_file.records_create.output_base64sha256
  timeout          = 15
  environment { variables = local.common_env }
  depends_on = [aws_cloudwatch_log_group.records_create]
}

resource "aws_lambda_function" "records_get" {
  function_name    = "${var.app_name}-records-get"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = var.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.records_get.output_path
  source_code_hash = data.archive_file.records_get.output_base64sha256
  timeout          = 15
  environment { variables = local.common_env }
  depends_on = [aws_cloudwatch_log_group.records_get]
}

resource "aws_lambda_function" "records_update" {
  function_name    = "${var.app_name}-records-update"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = var.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.records_update.output_path
  source_code_hash = data.archive_file.records_update.output_base64sha256
  timeout          = 15
  environment { variables = local.common_env }
  depends_on = [aws_cloudwatch_log_group.records_update]
}

resource "aws_lambda_function" "records_delete" {
  function_name    = "${var.app_name}-records-delete"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = var.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.records_delete.output_path
  source_code_hash = data.archive_file.records_delete.output_base64sha256
  timeout          = 15
  environment { variables = local.common_env }
  depends_on = [aws_cloudwatch_log_group.records_delete]
}

resource "aws_lambda_function" "records_export" {
  function_name    = "${var.app_name}-records-export"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = var.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.records_export.output_path
  source_code_hash = data.archive_file.records_export.output_base64sha256
  timeout          = 30  # PDF generation can take a moment for large datasets
  memory_size      = 256 # pdfkit benefits from extra memory
  environment { variables = local.common_env }
  depends_on = [aws_cloudwatch_log_group.records_export]
}

resource "aws_lambda_function" "ai_insights" {
  function_name    = "${var.app_name}-ai-insights"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = var.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.ai_insights.output_path
  source_code_hash = data.archive_file.ai_insights.output_base64sha256
  timeout          = 30 # Bedrock round-trips can take up to 10s
  environment {
    variables = merge(local.common_env, {
      BEDROCK_MODEL_ID = var.bedrock_model_id
    })
  }
  depends_on = [aws_cloudwatch_log_group.ai_insights]
}
