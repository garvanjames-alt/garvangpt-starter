#!/usr/bin/env bash
set -euo pipefail

base="http://localhost:3001"

echo "1) expand panadol"
curl -s "$base/api/admin/search/expand?q=panadol" | jq .

echo "2) expand acyclovir"
curl -s "$base/api/admin/search/expand?q=acyclovir" | jq .

echo "3) expand amoxil"
curl -s "$base/api/admin/search/expand?q=amoxil" | jq .

echo "4) expand ibuprofen"
curl -s "$base/api/admin/search/expand?q=ibuprofen" | jq .
