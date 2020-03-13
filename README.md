# datatomb

HTTP server for storing data sets.

## idea
This server is a data- and metadataprovider for [glacier](https://gitlab.spang-lab.de/jsimeth/glacier). It accepts dataset up- and downloads by authenticated users. 

### Immutability
It is important to realize that data sets are immutable once they have been published. This is necessary to ensure the integrity of downstream analyses. Therefore, there are only two roles: creating datasets and reading datasets. Deletion will be possible but is only intended to remove entire chains of datasets or orphaned datasets. It is not possible to modify datasets (also not their metadata), if such a modified dataset is necessary, it has to be uploaded as a new dataset (and future analysis must be based on this new dataset).

### Dataset handles
handles to datasets are hashes (see glacier), not human-readable names as these may be used several times. It is still possible to give names to datasets and search for them.

### Chains of Datasets
Often, data does not come out of nowhere, it is derived from other data. Therefore, datatomb stores a tree like structure and every dataset usually has one or more "parent" datasets (There may be no parent when the data is freshly created).

### Metadata and Logging
Along with the data, some metadata is stored. Searching datasets is based on this metadata rather than searching in the datasets itself. Whenever a dataset is downloaded, a log of who and when downloaded the dataset is kept (it should be possible to disable this). The owner of a dataset can see the log.

### Possible feature: Roles and Permissions
In a first step, there are only two roles: Owner / user and admin. The admin may do anything, normal users may push and download any dataset (even if it is not theirs!) and delete their own datasets. They may also see the access history of their own datasets. One may do this more finegrainedly such that the owner of a dataset can decide who exactly can download their datasets.

### Possible feature: Browsing datasets
A frontend may be added to search for datasets other than over the API.

### Possible feature: Webhooks
Users may register webhooks that are triggered upon upload of datasets with specific tags or so. If such an event happens, the server sends a POST request to a server the user may specify. This is useful for automatic analysis of recurring, similar datasets.

## Server config
### server
  - `port` the port on which the server is listening for requests.
  - `datasetpath` the path where datasets are being stored.

### database
  - `host` hostname of the postgreSQL server.
  - `database` db name
  - `port`

Database secrets must be provided in environment variables `POSTGRES_USER` and `POSTGRES_PASSWORD`

### authserver
  - `url` full url of token endpoint of the authserver.
  - `usergroup` name of the group that is allowed to access datatomb
  - `admingroup` name of the group that administers datatomb

## Authentification
Requests must contain a header with a access token issued by the auth server. Datatomb validates this token and may cache the result for a certain period of time if successful. For this time frame, this token is valid.

## API endpoints
Below is prefixed with `/api/v1/`.

### `GET /meta/<hash>`
returns all metadata of `<hash>` as json object.

### `GET /meta/search?<query>`
returns a list of hashes. `query` may be any key-value pair combining
  - `any`: free text search in all fields
  - `name`: user-provided (possibly non-unique) name of the dataset.
  - `author`: datasets authored by some specific user
  - `tag`: dataset has tag attached
  - `description`: free text search in description field
  - `after`: created after some time point (unix time)
  - `before`: created before some time point (unix time)
  - `lastAccessBefore`: last access before some time point (unix time). Only available for admins and mainly used to identify deletion candidates
  - `child=<hash>`: returns all parents of `hash`
  - `hash=<hash>`: returns itself (can be used to check for existance of a hash)
  - `commit`: commit or id that can be used to identify a commit.
  - `project`: project id
  
Several conditions are AND-connected.

Example: `GET /meta/search?name=my_dataset&author=my_user` will return all datasets named "my_dataset" and were created by "my_user".

TODO: anything else??
### `GET /log/<hash>`
If you are the owner of the dataset `<hash>` (or admin), you may see the access history to that data set.
### `GET /<hash>`
downloads dataset, if you are allowed to.
### `POST /upload`
uploads dataset: Multiform-post with exactly two fields:
  - `file`: the file to upload
  - `data`: json object that contains all metadata
  
Example for a `data` object:
```
{
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
}
```

field names are mostly self explicatory. There are three possible values for `share`: `private`, `internal` (default) and `public`. `private` means only you can download and change the file. `internal` means any registered and authenticated datatomb user may download the file, but only you may delete it and `public` means access is possible without authentication. This holds for actual data and metadata. logs are always only readable by the owner and admins.

### `DELETE /<hash>`
If you are the owner of a dataset or admin, you may remove your published data sets.

### `GET /healthy`
return 1 if healthy / ready for connections.

## Database schema
  - table `tags(name primary unique)`
  - table `log(id primary, operation, who, time, dataset => datasets.hash)` (operation may be one of created, read, delete)
  - table `datagenerators(id primary, kind, instance, ref)`
    this may be used to say what and how to generate this piece of data. Typically, `kind='git'`, then. instance is the repository and ref the commit or tag to be checked out. Other use cases may include pipeline services or web front ends that generate data. In any case, `instance` shall refer to the particular address / instance of the service from which the generating entity can be received, and `ref` is the id / key under which this entity in receivable from the instance. `kind` may be kept relatively unstandardized, except for `git` which should be used as above.
  - table `parentDatasets(child => datasets.hash, parent => datasets.hash)`
  - table `datasetTags(dataset => datasets.hash, tag => tags.name)`
  - table `datasets(hash primary unique, name, projectname, description, data, source => datagenerators.id)`

## Auth server
uses the ldap-speaking [auth server](https://gitlab.spang-lab.de/containers/auth-server) for authentification. Authentification is granted based on two groups, defined in the authserver section of the config file. If the user is in the `usergroup`, he or she may up- and download datasets and history of his or her own datasets may be queried. If he or she is also in the admin group, history of foreign datasets is accessible and datasets can be deleted.
