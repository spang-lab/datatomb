#/usr/bin/env bash
source ./creds.src

hash=$(sha256sum testfile | cut -d " " -f 1)

curl -X DELETE ${BASEURL}/${hash}

if [ -e derivedtestfile ]; then
  hash=$(sha256sum derivedtestfile | cut -d " " -f 1)
  curl -X DELETE ${BASEURL}/${hash}
fi
