#/usr/bin/env bash
source ./creds.src

#"url": "https://httpbin.org/post",

echo token=$token
webhookid=$(curl \
    -H 'content-type: application/json' \
    -H "Authorization: $token" \
    -d '{
        "onTag": "webhooktag",
        "url": "http://localhost:8081/api/v1/webhookWait",
        "authenticate": false
      }' \
        ${BASEURL}/webhooks/register)
echo "webhookid: $webhookid"
