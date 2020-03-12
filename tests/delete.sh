#/usr/bin/env bash
source ./creds.src

hash=$(sha256sum testfile | cut -d " " -f 1)

curl -X DELETE ${BASEURL}/${hash}
