#!/bin/bash
cd ${0%/*}
#
# Produce a release build
#
cd ..

npm run build:prod

quiet=--quiet

VERSION=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Release ?v=22 $VERSION" > src/release.txt
git add . 
git commit $quiet -m "$VERSION"
git push $quiet

