#/usr/bin/env bash
source ./creds.src

webhookid=$1
if [ -z $webhookid ]; then
  echo "no id argument." > /dev/stderr
  exit 1
fi

echo token=$token
curl \
    -X DELETE \
    -H "Authorization: $token" \
        ${BASEURL}/webhooks/$webhookid
