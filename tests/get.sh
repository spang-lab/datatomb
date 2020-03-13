#/usr/bin/env bash -xe
source ./creds.src

hash=$(sha256sum testfile | cut -d " " -f 1)
otherhash=$(sha256sum derivedtestfile | cut -d " " -f 1)

# we can access this dataset if we are a datatomb user.
curl -X GET -H "Authorization: $token" ${BASEURL}/${hash}

#the other dataset is public and no auth is necessary:
curl -X GET  ${BASEURL}/${otherhash}
