#!/bin/sh
ROOT_DIR=/app/dist
for file in $ROOT_DIR/js/*.js* $ROOT_DIR/index.html
do
    sed -i "s|VUE_APP_API_ROOT_PLACEHOLDER|$VUE_APP_API_ROOT|g" $file
    sed -i "s|VUE_APP_MAIN_DOMAIN_PLACEHOLDER|$VUE_APP_MAIN_DOMAIN|g" $file
    sed -i "s|VUE_APP_PUSHER_KEY_PLACEHOLDER|$VUE_APP_PUSHER_KEY|g" $file
done
node index.js