# Weather Dashboard — AWS Edition

A full-stack weather application rebuilt on AWS serverless infrastructure.  
Built by **Philippe Mathieu** as a portfolio companion to the original Next.js + Supabase version.

---

## What's Different from the Original

| | Original | AWS Edition |
|---|---|---|
| Database | Supabase (PostgreSQL) | **Amazon DynamoDB** |
| Backend | Next.js API routes | **AWS Lambda + API Gateway** |
| Infrastructure | None | **Terraform** |
| AI Feature | — | **Amazon Bedrock (Claude 3 Haiku)** |
| Frontend | Next.js | Next.js (same UI + AI Insights card) |

---

## Architecture

```
Browser → Next.js API routes → API Gateway → Lambda → DynamoDB
                                                 ↓
                                          Amazon Bedrock
                                       (Claude 3 Haiku AI)
```

All AWS resources are provisioned with Terraform. The Next.js API routes act as a thin proxy to API Gateway, keeping the API Gateway URL and all API keys server-side.

---

## AWS Components

| Service | Purpose |
|---|---|
| **DynamoDB** | Weather records table (replaces Supabase). PAY_PER_REQUEST billing, PITR enabled, two GSIs |
| **Lambda** | 7 functions: list, create, get, update, delete, export, AI insights |
| **API Gateway** | REST API exposing all Lambda functions with CORS support |
| **IAM** | Least-privilege execution role with scoped DynamoDB and Bedrock policies |
| **CloudWatch** | Log groups (14-day retention) for each Lambda function |
| **Bedrock** | Claude 3 Haiku — generates weather summaries, activity and clothing recommendations |

---

## New AI Feature — Weather Insights

After searching any location, an **AI Insights card** appears below the forecast. It uses Amazon Bedrock (Claude 3 Haiku) to generate:

- **Summary** — one-sentence overview of the day's conditions
- **Activities** — 3 things to do given the current weather
- **What to Wear** — 3 clothing/gear suggestions

The Bedrock Lambda receives the live weather data and builds a structured prompt. Claude responds with clean JSON that the frontend renders as a glass card. If Bedrock is unavailable or not yet enabled, the card silently hides.

---

## Getting Started

### Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform >= 1.5
- Node.js >= 20

### 1. Clone and install

```bash
git clone https://github.com/Philmattt04/weather-app-aws.git
cd weather-app-aws
npm install
```

### 2. Build the export Lambda (needs pdfkit)

```bash
cd lambda/records-export && npm install && cd ../..
```

### 3. Create Terraform variables file

```bash
cat > terraform/terraform.tfvars <<EOF
openweather_api_key = "your_openweathermap_key"
youtube_api_key     = "your_youtube_api_key"
EOF
```

### 4. Enable Bedrock model access

In the AWS Console:
1. Go to **Amazon Bedrock → Model Access**
2. Click **Manage model access**
3. Enable **Claude 3 Haiku** (Anthropic)
4. Wait ~1 minute for access to activate

### 5. Deploy infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
cd ..
```

Copy the `api_gateway_base_url` from the Terraform output.

### 6. Configure the frontend

```bash
cp .env.example .env.local
# Edit .env.local and fill in:
#   API_GATEWAY_URL  — from terraform output
#   OPENWEATHER_API_KEY
#   YOUTUBE_API_KEY
```

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Migrating Data from Supabase

If you have existing records in the original app's Supabase database:

```bash
cd scripts
npm install
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_ANON_KEY=your_anon_key \
DYNAMODB_TABLE=weather-app-records \
AWS_REGION=us-east-1 \
node migrate.js
```

The script is idempotent — safe to run multiple times.

---

## Terraform Resources

```
terraform/
├── main.tf              # Provider + archive_file data sources for Lambda zips
├── variables.tf         # All input variables
├── outputs.tf           # API Gateway URL, table name, Lambda ARNs
├── dynamodb.tf          # weather_records table + 2 GSIs
├── iam.tf               # Lambda execution role, DynamoDB policy, Bedrock policy
├── lambda.tf            # 7 Lambda functions + CloudWatch log groups
├── api_gateway.tf       # REST API, all routes, CORS, deployment, stage
└── lambda_permissions.tf # API Gateway → Lambda invoke permissions
```

**Destroy all resources:**
```bash
cd terraform && terraform destroy
```

---

## Lambda Functions

| Function | Route | Description |
|---|---|---|
| `records-list` | GET /records | Scan + sort all records |
| `records-create` | POST /records | Create with UUID, timestamps |
| `records-get` | GET /records/{id} | Single record lookup |
| `records-update` | PUT /records/{id} | Edit notes, units, temperature_data |
| `records-delete` | DELETE /records/{id} | Delete with existence check |
| `records-export` | GET /records/export | JSON / CSV / XML / MD / PDF |
| `ai-insights` | POST /ai | Bedrock Claude 3 Haiku insights |

---

## Frontend Changes from Original

All existing components are identical. The AWS edition adds:

- `app/components/AIInsights.tsx` — new AI insights card
- `app/api/ai-insights/route.ts` — Bedrock proxy route
- `app/api/records/route.ts` — proxies to API Gateway (was Supabase)
- `app/api/records/[id]/route.ts` — proxies to API Gateway
- `app/api/records/export/route.ts` — proxies to API Gateway
- `app/lib/apiGateway.ts` — API Gateway URL helper
- `app/types/ai.ts` — AIInsight type definition

The original weather API routes (`/api/weather`, `/api/weather-range`, `/api/youtube`) are unchanged — they call OpenWeatherMap and Open-Meteo directly and don't touch the database.

---

## About PM Accelerator

Product Manager Accelerator (PMA) is the #1 platform for aspiring and experienced Product Managers to accelerate their careers. Through expert coaching, a thriving community, and curated resources, PMA has helped thousands of PMs land their dream jobs, build world-class products, and excel in the ever-evolving tech landscape.

[LinkedIn →](https://www.linkedin.com/school/pmaccelerator/)
