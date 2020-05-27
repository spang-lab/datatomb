#/usr/bin/env bash
source ./creds.src

echo token=$token
curl \
    -H "Authorization: $token" \
        ${BASEURL}/webhooks/list
