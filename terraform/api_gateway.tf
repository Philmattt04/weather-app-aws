# ── REST API ──────────────────────────────────────────────────────────────────

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.app_name}-api"
  description = "Weather App API — routes to Lambda, backed by DynamoDB"
}

# ── Resources (path segments) ─────────────────────────────────────────────────

resource "aws_api_gateway_resource" "records" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "records"
}

# /records/export must be declared before /records/{id} so the literal
# path segment beats the path parameter when API Gateway routes requests
resource "aws_api_gateway_resource" "records_export" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.records.id
  path_part   = "export"
}

resource "aws_api_gateway_resource" "records_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.records.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "ai" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "ai"
}

# ── Helper locals for DRY integration URIs ───────────────────────────────────

locals {
  lambda_uri = {
    records_list   = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.records_list.arn}/invocations"
    records_create = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.records_create.arn}/invocations"
    records_get    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.records_get.arn}/invocations"
    records_update = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.records_update.arn}/invocations"
    records_delete = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.records_delete.arn}/invocations"
    records_export = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.records_export.arn}/invocations"
    ai_insights    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.ai_insights.arn}/invocations"
  }
  cors_headers = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
  cors_response_params = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ── /records ──────────────────────────────────────────────────────────────────

resource "aws_api_gateway_method" "records_get_all" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.records.id
  http_method   = "GET"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "records_get_all" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.records.id
  http_method             = aws_api_gateway_method.records_get_all.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = local.lambda_uri.records_list
}

resource "aws_api_gateway_method" "records_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.records.id
  http_method   = "POST"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "records_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.records.id
  http_method             = aws_api_gateway_method.records_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = local.lambda_uri.records_create
}

resource "aws_api_gateway_method" "records_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.records.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "records_options" {
  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = aws_api_gateway_resource.records.id
  http_method       = aws_api_gateway_method.records_options.http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}
resource "aws_api_gateway_method_response" "records_options_200" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.records.id
  http_method         = aws_api_gateway_method.records_options.http_method
  status_code         = "200"
  response_parameters = local.cors_headers
}
resource "aws_api_gateway_integration_response" "records_options" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.records.id
  http_method         = aws_api_gateway_method.records_options.http_method
  status_code         = "200"
  response_parameters = local.cors_response_params
  depends_on          = [aws_api_gateway_integration.records_options]
}

# ── /records/export ───────────────────────────────────────────────────────────

resource "aws_api_gateway_method" "export_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.records_export.id
  http_method   = "GET"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "export_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.records_export.id
  http_method             = aws_api_gateway_method.export_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = local.lambda_uri.records_export
}

resource "aws_api_gateway_method" "export_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.records_export.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "export_options" {
  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = aws_api_gateway_resource.records_export.id
  http_method       = aws_api_gateway_method.export_options.http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}
resource "aws_api_gateway_method_response" "export_options_200" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.records_export.id
  http_method         = aws_api_gateway_method.export_options.http_method
  status_code         = "200"
  response_parameters = local.cors_headers
}
resource "aws_api_gateway_integration_response" "export_options" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.records_export.id
  http_method         = aws_api_gateway_method.export_options.http_method
  status_code         = "200"
  response_parameters = local.cors_response_params
  depends_on          = [aws_api_gateway_integration.export_options]
}

# ── /records/{id} ─────────────────────────────────────────────────────────────

resource "aws_api_gateway_method" "record_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.records_id.id
  http_method   = "GET"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "record_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.records_id.id
  http_method             = aws_api_gateway_method.record_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = local.lambda_uri.records_get
}

resource "aws_api_gateway_method" "record_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.records_id.id
  http_method   = "PUT"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "record_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.records_id.id
  http_method             = aws_api_gateway_method.record_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = local.lambda_uri.records_update
}

resource "aws_api_gateway_method" "record_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.records_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "record_delete" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.records_id.id
  http_method             = aws_api_gateway_method.record_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = local.lambda_uri.records_delete
}

resource "aws_api_gateway_method" "record_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.records_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "record_options" {
  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = aws_api_gateway_resource.records_id.id
  http_method       = aws_api_gateway_method.record_options.http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}
resource "aws_api_gateway_method_response" "record_options_200" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.records_id.id
  http_method         = aws_api_gateway_method.record_options.http_method
  status_code         = "200"
  response_parameters = local.cors_headers
}
resource "aws_api_gateway_integration_response" "record_options" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.records_id.id
  http_method         = aws_api_gateway_method.record_options.http_method
  status_code         = "200"
  response_parameters = local.cors_response_params
  depends_on          = [aws_api_gateway_integration.record_options]
}

# ── /ai ───────────────────────────────────────────────────────────────────────

resource "aws_api_gateway_method" "ai_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai.id
  http_method   = "POST"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "ai_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.ai.id
  http_method             = aws_api_gateway_method.ai_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = local.lambda_uri.ai_insights
}

resource "aws_api_gateway_method" "ai_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "ai_options" {
  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = aws_api_gateway_resource.ai.id
  http_method       = aws_api_gateway_method.ai_options.http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}
resource "aws_api_gateway_method_response" "ai_options_200" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.ai.id
  http_method         = aws_api_gateway_method.ai_options.http_method
  status_code         = "200"
  response_parameters = local.cors_headers
}
resource "aws_api_gateway_integration_response" "ai_options" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.ai.id
  http_method         = aws_api_gateway_method.ai_options.http_method
  status_code         = "200"
  response_parameters = local.cors_response_params
  depends_on          = [aws_api_gateway_integration.ai_options]
}

# ── Deployment & Stage ────────────────────────────────────────────────────────

# Redeploy whenever any method or integration changes
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.records_get_all,
      aws_api_gateway_integration.records_post,
      aws_api_gateway_integration.export_get,
      aws_api_gateway_integration.record_get,
      aws_api_gateway_integration.record_put,
      aws_api_gateway_integration.record_delete,
      aws_api_gateway_integration.ai_post,
    ]))
  }

  lifecycle { create_before_destroy = true }
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  deployment_id = aws_api_gateway_deployment.main.id
  stage_name    = var.stage_name

  tags = { Project = var.app_name }
}
