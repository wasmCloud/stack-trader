#!/usr/bin/env bash 

set -euo pipefail

envsubst '$RESGATE_HOST' < ./nginx.template > /etc/nginx/nginx.conf

cat /etc/nginx/nginx.conf

nginx