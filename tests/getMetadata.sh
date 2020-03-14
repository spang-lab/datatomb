#/usr/bin/env bash -xe
source ./creds.src

hash=$(sha256sum testfile | cut -d " " -f 1)

curl -X GET -H "Authorization: $token" ${BASEURL}/meta/${hash}



hash=$(sha256sum combinedtestfile | cut -d " " -f 1)

curl -X GET -H "Authorization: $token" ${BASEURL}/meta/${hash}
