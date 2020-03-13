#/usr/bin/env bash
source ./creds.src

echo token=$token
parent=$(curl \
    -H 'content-type: multipart/form-data' \
    -H "Authorization: $token" \
    -F file=@testfile \
    -F data='{
        "tags": ["testtag1", "testtag2"],
        "name": "testfile",
        "projectname": "testproject",
        "description": "this is a long description for such a short file.",
        "share": "internal",
        "data": {
            "someadditional": "data",
            "count": 1
          },
        "generator": {
            "kind": "manual",
            "instance": "my brain",
            "ref": null
          }
      }' \
        ${BASEURL}/upload)
echo "parent: $parent"

sha=$(sha256sum testfile | cut -d " " -f 1)
returnedSha=$(echo $parent | jq '.hash' | sed "s|\"||g")

if [ "$returnedSha" != "$sha" ]; then
  echo "returnedSha=$returnedSha and actual sha=$sha do not match."
  exit 1;
fi

cp testfile derivedtestfile
echo "derived dataset" >> derivedtestfile

child=$(curl \
    -H 'content-type: multipart/form-data' \
    -H "Authorization: $token" \
    -F file=@derivedtestfile \
    -F data='{
        "tags": ["testtag1", "testtag2", "derived"],
        "name": "derivedtestfile",
        "projectname": "testproject",
        "parent": "'$sha'",
        "description": "this is another long description for such a short file.",
        "share": "public",
        "data": {
            "someadditional": "data",
            "count": 2
          },
        "generator": {
            "kind": "manual",
            "instance": "my brain",
            "ref": null
          }
      }' \
        ${BASEURL}/upload)

echo $child

sha=$(sha256sum derivedtestfile | cut -d " " -f 1)
returnedSha=$(echo $child | jq '.hash' | sed "s|\"||g")

if [ "$returnedSha" != "$sha" ]; then
  echo "returnedSha=$returnedSha and actual sha=$sha do not match."
  exit 1;
fi
