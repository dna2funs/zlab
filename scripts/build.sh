#!/bin/bash

SELF=$(cd `dirname $0`/..; pwd)

echo Compling API server ...
$SELF/node_modules/.bin/webpack

echo Collecting client static files ...
if [ -d $SELF/dist/static ]; then
   rm -r $SELF/dist/static
fi
cp -r $SELF/static $SELF/dist/

