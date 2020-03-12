#/usr/bin/env bash -xe
source ./creds.src

curl -X GET ${BASEURL}/healthy
