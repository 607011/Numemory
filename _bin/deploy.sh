#!/bin/sh

source .env

DIST=dist

mkdir -p sounds
mkdir -p ${DIST}/sounds
cp -r index.html js css images manifest.json service-worker.js fonts data ${DIST}
echo Minifying ...
minify ${DIST}/index.html -o ${DIST}/index.html
minify ${DIST}/js/game.js -o ${DIST}/js/game.js
echo Optimizing images ...
optipng -quiet -o7 ${DIST}/images/*.png
echo Syncing to ${DST} ...
cd ${DIST}
rsync --exclude '.DS_Store' -Rrav . ${DST}
