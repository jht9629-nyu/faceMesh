#!/bin/bash
cd ${0%/*}
#
# Produce a release build
#
cd ..

npm run build:prod

quiet=--quiet

DATEVER=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Release ?v=23 $DATEVER" > src/release.txt
git add . 
git commit $quiet -m "?v=23 $DATEVER"
git push $quiet

