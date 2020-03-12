#/usr/bin/env bash -xe
source ./creds.src

hash=$(sha256sum testfile | cut -d " " -f 1)

curl -X GET -H "Authorization: $token" ${BASEURL}/log/${hash}
