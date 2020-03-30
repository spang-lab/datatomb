#/usr/bin/env bash
source ./creds.src
# we upload a file which is fine, except that we give a null instance, which the db doesn.t like.

echo token=$token
parent=$(curl \
    -D /dev/stdout \
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
            "instance": null,
            "ref": null
          }
      }' \
        ${BASEURL}/upload)
echo "parent: $parent"

firstsha=$(sha256sum testfile | cut -d " " -f 1)
returnedSha=$(echo $parent | jq '.hash' | sed "s|\"||g")
