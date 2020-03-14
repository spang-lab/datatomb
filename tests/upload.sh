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

firstsha=$(sha256sum testfile | cut -d " " -f 1)
returnedSha=$(echo $parent | jq '.hash' | sed "s|\"||g")

if [ "$returnedSha" != "$firstsha" ]; then
  echo "returnedSha=$returnedSha and actual sha=$firstsha do not match."
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
        "parents": ["'$firstsha'"],
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

secondsha=$(sha256sum derivedtestfile | cut -d " " -f 1)
returnedSha=$(echo $child | jq '.hash' | sed "s|\"||g")

if [ "$returnedSha" != "$secondsha" ]; then
  echo "returnedSha=$returnedSha and actual sha=$secondsha do not match."
  exit 1;
fi

cp testfile combinedfile
cat derivedtestfile >> combinedtestfile

secondchild=$(curl \
    -H 'content-type: multipart/form-data' \
    -H "Authorization: $token" \
    -F file=@combinedtestfile \
    -F data='{
        "tags": ["combined", "testtag2", "derived"],
        "name": "combinedtestfile",
        "projectname": "testproject",
        "parents": ["'$firstsha'", "'$secondsha'"],
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

echo $secondchild

thirdsha=$(sha256sum combinedtestfile | cut -d " " -f 1)
returnedSha=$(echo $secondchild | jq '.hash' | sed "s|\"||g")

if [ "$returnedSha" != "$thirdsha" ]; then
  echo "returnedSha=$returnedSha and actual sha=$thirdsha do not match."
  exit 1;
fi
