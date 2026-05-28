#!/bin/sh
set -e

# Extract hostname from BACKEND_URL for proxy Host header
export BACKEND_HOST=$(echo "$BACKEND_URL" | sed 's|https\?://||' | sed 's|/.*||')

# Replace environment variables in nginx config template
envsubst '${BACKEND_URL} ${BACKEND_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
