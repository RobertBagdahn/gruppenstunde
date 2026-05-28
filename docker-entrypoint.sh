#!/bin/sh
set -e
# Copy static config (no env substitution needed)
cp /etc/nginx/conf.d/default.conf.template /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
