#!/bin/bash

# Setup test database for e2e tests
echo "Setting up test database..."

# Load environment variables
source .env.development

# Create test database
echo "Creating test database: ${DB_NAME:-stockplay}_test"
psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USERNAME:-postgres} -d postgres -f scripts/create-test-db.sql

echo "Test database setup complete!"
echo "You can now run e2e tests with: npm run test:e2e"
