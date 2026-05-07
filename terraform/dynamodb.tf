# DynamoDB table — replaces the Supabase weather_records table.
# PAY_PER_REQUEST billing removes the need to estimate capacity for a personal app.
resource "aws_dynamodb_table" "weather_records" {
  name         = "${var.app_name}-records"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id" # UUID string — same value as the original Supabase UUID PK

  # Base table attribute definitions (only attributes used as keys)
  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "city_name"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "units"
    type = "S"
  }

  # GSI 1: query all records for a specific city, sorted newest first
  global_secondary_index {
    name            = "CityNameIndex"
    hash_key        = "city_name"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI 2: query records by unit system, sorted newest first
  # Low cardinality PK is intentional — enables sorted Query vs full Scan
  global_secondary_index {
    name            = "UnitsCreatedAtIndex"
    hash_key        = "units"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # Point-in-time recovery so records are never permanently lost by accident
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Project     = var.app_name
    Environment = var.stage_name
  }
}
