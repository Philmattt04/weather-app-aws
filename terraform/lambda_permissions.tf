# Grant API Gateway permission to invoke each Lambda function.
# source_arn scoped to this API's execution ARN prevents other APIs
# from invoking these functions.

locals {
  apigw_source_arn = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "records_list" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.records_list.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}

resource "aws_lambda_permission" "records_create" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.records_create.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}

resource "aws_lambda_permission" "records_get" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.records_get.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}

resource "aws_lambda_permission" "records_update" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.records_update.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}

resource "aws_lambda_permission" "records_delete" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.records_delete.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}

resource "aws_lambda_permission" "records_export" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.records_export.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}

resource "aws_lambda_permission" "ai_insights" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ai_insights.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}

resource "aws_lambda_permission" "weather" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.weather.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}

resource "aws_lambda_permission" "weather_range" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.weather_range.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}

resource "aws_lambda_permission" "youtube" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.youtube.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.apigw_source_arn
}
