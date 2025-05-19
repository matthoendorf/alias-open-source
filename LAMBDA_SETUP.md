# Setting up Roundtable Alias as an AWS Lambda Function

This guide will walk you through the process of setting up the Roundtable Alias Open Source repository as an AWS Lambda function.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [AWS CLI](https://aws.amazon.com/cli/) installed and configured
- [Serverless Framework](https://www.serverless.com/) installed globally (`npm install -g serverless`)
- An OpenAI API key

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/roundtableAI/alias-open-source.git
   cd alias-open-source
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create an `env.json` file based on the `env.json.example` template:
   ```bash
   cp env.json.example env.json
   ```

4. Edit the `env.json` file and add your OpenAI API key:
   ```json
   {
     "API_SECRET": "Bearer sk-your-openai-api-key"
   }
   ```

   Note: When using AWS SSO, you don't need to include AWS credentials in the env.json file.

## Local Development

You can run the Lambda function locally using the Serverless Offline plugin:

```bash
npm run dev
```

This will start a local server at http://localhost:3000 that simulates the AWS Lambda environment. For local development, you only need the OpenAI API key in your env.json file - the AWS resources will be mocked locally by the Serverless Offline plugin.

## Deployment

To deploy the Lambda function to AWS:

```bash
npm run deploy
```

### Using AWS SSO

Before deploying, make sure you've authenticated with AWS SSO:

```bash
aws sso login
```

Then deploy normally:

```bash
npm run deploy
```

If you want to use a different profile, you can specify it:

```bash
npm run deploy --profile your-profile-name
```

This will create the following resources in your AWS account:

- Two Lambda functions:
  - `roundtable-alias-dev-api`: The main API endpoint for processing survey responses
  - `roundtable-alias-dev-identifyDuplicates`: A helper function for identifying duplicate responses
- Two DynamoDB tables:
  - `roundtable-alias-dev-responses`: Stores survey responses
  - `roundtable-alias-dev-groups`: Stores response group information

## API Usage

Once deployed, you can use the Lambda function by sending a POST request to the API endpoint with the following JSON payload:

```json
{
  "questions": {
    "q1": "What is your favorite color?",
    "q2": "Describe your ideal vacation."
  },
  "survey_id": "survey123",
  "participant_id": "participant456",
  "responses": {
    "q1": "Blue",
    "q2": "A relaxing beach vacation with plenty of sunshine."
  }
}
```

The API will return a response with the following structure:

```json
{
  "error": false,
  "checks": {
    "q1": [],
    "q2": []
  },
  "response_groups": {
    "q1": 1,
    "q2": 2
  },
  "effort_ratings": {
    "q1": 3,
    "q2": 7
  }
}
```

The `checks` field will contain any flags for problematic responses (e.g., "Profane", "Off-topic", "Gibberish", "GPT", "Low-effort", "Cross-duplicate response", "Self-duplicate response").

For more detailed information about the API endpoints, request/response formats, and usage examples, please refer to the [API Documentation](API.md).

## Customization

You can customize the Lambda function by modifying the following files:

- `config.js`: Contains configuration parameters for duplicate detection and OpenAI model selection
- `helpers/prompts.js`: Contains the prompts used for OpenAI categorization and effort scoring
- `helpers/cross-duplicate-utils.js`: Contains the logic for detecting duplicate responses

## Troubleshooting

If you encounter any issues during deployment or usage, check the CloudWatch logs for the Lambda functions:

```bash
serverless logs -f api
serverless logs -f identifyDuplicates
```

## Cleanup

To remove all AWS resources created by the Serverless Framework:

```bash
serverless remove
```

This will delete the Lambda functions, API Gateway endpoints, and DynamoDB tables.
