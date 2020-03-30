#/usr/bin/env bash -xe
source ./creds.src

hash=$(sha256sum testfile | cut -d " " -f 1)

# wrong token:
curl -X GET -D /dev/stdout -H "Authorization: wrongtoken" ${BASEURL}/${hash}
# no token
curl -X GET -D /dev/stdout  ${BASEURL}/${hash}
