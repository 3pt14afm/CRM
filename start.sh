#!/usr/bin/env bash

set -e

php artisan serve &
npm run dev &

wait
