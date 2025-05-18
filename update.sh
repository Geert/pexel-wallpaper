#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to the .env file
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE"
  # Read the .env file, remove comments and empty lines, then export
  # This handles variables with or without quotes, and allows for spaces in values if quoted.
  # It does not handle multi-line variables or complex shell expansions within the .env file values.
  export $(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | xargs)
else
  echo "Warning: $ENV_FILE not found. Proceeding without loading .env file."
fi

# Now execute the python script
# It will have access to the environment variables loaded from .env
python3 fetch_pexels_urls.py