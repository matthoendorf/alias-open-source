#!/bin/bash

# Script to deploy serverless applications with AWS SSO credentials in WSL
# Created to solve the "security token included in the request is expired" error

# Ensure we have a valid SSO session
echo "Refreshing AWS SSO session..."
aws sso login --profile ${AWS_PROFILE:-default}

# Get the AWS account ID and verify credentials
echo "Verifying AWS credentials..."
aws sts get-caller-identity --profile ${AWS_PROFILE:-default}

# Create a temporary credentials file
echo "Creating temporary credentials file..."
mkdir -p ~/.aws/cli/cache
CREDS_FILE=$(mktemp)

# Use the AWS CLI to get the credentials
echo "Getting temporary credentials..."
aws configure export-credentials --profile ${AWS_PROFILE:-default} > $CREDS_FILE

# Extract the credentials
ACCESS_KEY=$(grep -o '"AccessKeyId": "[^"]*' $CREDS_FILE | cut -d'"' -f4)
SECRET_KEY=$(grep -o '"SecretAccessKey": "[^"]*' $CREDS_FILE | cut -d'"' -f4)
SESSION_TOKEN=$(grep -o '"SessionToken": "[^"]*' $CREDS_FILE | cut -d'"' -f4)

# Clean up
rm $CREDS_FILE

# Check if we got the credentials
if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ] || [ -z "$SESSION_TOKEN" ]; then
  echo "Failed to get temporary credentials."
  exit 1
fi

echo "Successfully retrieved temporary credentials."

# Export the credentials as environment variables
export AWS_ACCESS_KEY_ID=$ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=$SECRET_KEY
export AWS_SESSION_TOKEN=$SESSION_TOKEN

# Unset AWS_PROFILE to ensure the credentials are used
unset AWS_PROFILE

echo "Running serverless deploy with temporary credentials..."
serverless deploy "$@"
