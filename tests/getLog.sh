#/usr/bin/env bash -xe
source ./creds.src

if [ -z "$1" ]; then
  hash=$(sha256sum testfile | cut -d " " -f 1)
else
  hash=$1;
fi

curl -X GET -H "Authorization: $token" ${BASEURL}/log/${hash}
#curl -X GET ${BASEURL}/log/${hash}
