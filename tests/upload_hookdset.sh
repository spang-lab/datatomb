#/usr/bin/env bash
source ./creds.src

echo token=$token
parent=$(curl \
    -H 'content-type: multipart/form-data' \
    -H "Authorization: $token" \
    -F file=@testfile \
    -F data='{
        "tags": ["testtag1", "testtag2", "webhooktag"],
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


echo $parent
