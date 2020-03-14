#/usr/bin/env bash -xe
source ./creds.src

#hash=$(sha256sum testfile | cut -d " " -f 1)
#otherhash=$(sha256sum derivedtestfile | cut -d " " -f 1)

#curl -X GET -H "Authorization: $token" "${BASEURL}/meta/search?description=another&tag=testtag1&author=jsimeth"
#curl -X GET -H "Authorization: $token" "${BASEURL}/meta/search?author=jsimeth&tag=derived"
#curl -X GET -H "Authorization: $token" "${BASEURL}/meta/search?author=jsimeth&any=derived"
curl -X GET -H "Authorization: $token" "${BASEURL}/meta/search?author=jsimeth&after=2020-01-01"
