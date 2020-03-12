#/usr/bin/env bash
source ./creds.src

curl \
    -H 'content-type: multipart/form-data' \
    -F file=@testfile \
    -F data='{"somekey": "blub"}' \
    ${BASEURL}/upload
