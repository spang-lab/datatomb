#/usr/bin/env bash -xe
source ./creds.src

curl -X GET -H "Authorization: $token" ${BASEURL}/auth
