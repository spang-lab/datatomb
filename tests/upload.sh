#/usr/bin/env bash
source ./creds.src

curl \
    -H 'content-type: multipart/form-data' \
    -F file=@testfile \
    -F data='{
        "tags": ["testtag1", "testtag2"],
        "name": "testdatum",
        "projectname": "testproject",
        "description": "this is a long description for such a short file.",
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
    ${BASEURL}/upload
