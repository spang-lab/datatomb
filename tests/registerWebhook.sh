#/usr/bin/env bash
source ./creds.src

echo token=$token
webhookid=$(curl \
    -H 'content-type: application/json' \
    -H "Authorization: $token" \
    -d '{
        "onTag": "webhooktag",
        "url": "https://httpbin.org/post",
        "authenticate": false
      }' \
        ${BASEURL}/webhooks/register)
echo "webhookid: $webhookid"
