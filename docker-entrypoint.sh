#!/bin/sh
set -e

BACKEND_URL="${BACKEND_URL:-https://inspi-backend-24xnoearra-ew.a.run.app}"
BACKEND_HOST=$(echo "$BACKEND_URL" | sed 's|https://||' | sed 's|/.*||')

export BACKEND_URL BACKEND_HOST

envsubst '${BACKEND_URL} ${BACKEND_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
