#/usr/bin/env bash -xe
source ./creds.src
searchstr=$1
echo $searchstr

curl -X GET -H "Authorization: $token" "${BASEURL}/meta/search?$searchstr"
