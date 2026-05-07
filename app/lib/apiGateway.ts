/**
 * API Gateway base URL helper.
 *
 * All Next.js API routes proxy their requests through this URL to the
 * AWS Lambda functions. Setting API_GATEWAY_URL switches the backend from
 * Supabase to DynamoDB without changing any frontend component code.
 *
 * Get the URL after `terraform apply` with:
 *   terraform -chdir=terraform output api_gateway_base_url
 */

export function getApiGatewayBase(): string {
  const url = process.env.API_GATEWAY_URL;
  if (!url) throw new Error("API_GATEWAY_URL is not set in .env.local");
  return url.replace(/\/$/, ""); // strip trailing slash for consistent concatenation
}
