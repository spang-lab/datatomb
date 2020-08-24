#/usr/bin/env bash
source ./creds.src

#"url": "https://httpbin.org/post",

#"url": "http://pc1011800780.ur.de:8000/gene_expression",

echo token=$token
webhookid=$(curl \
    -H 'content-type: application/json' \
    -H "Authorization: $token" \
    -d '{
        "onTag": "webhooktag",
        "url": "http://localhost:8081/api/v1/webhookDl",
        "authenticate": false
      }' \
        ${BASEURL}/webhooks/register)
echo "webhookid: $webhookid"
