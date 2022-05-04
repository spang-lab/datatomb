# datatomb

HTTP server for storing and retrieving data sets and associated metadata.

## Ideas and concepts
This server is a data- and metadataprovider for [glacier](https://gitlab.spang-lab.de/jsimeth/glacier) and [diggeR](https://gitlab.spang-lab.de/jsimeth/digger). It accepts dataset up- and downloads by authenticated users. 

### Dataset handles
handles to datasets are their sha25sum hashes, not human-readable names as these may be non-unique. It is still possible to give alias names to datasets and search for them. This concept means that datasets are referred to by their contents and not by their names (adressing by content, [content-addressable storage](https://en.wikipedia.org/wiki/Content-addressable_storage)) and ensures that references to a dataset don't change over time. Also, a hash is always recalculable and so metadata to a given file can be retrieved without knowing its id on the server.

### Chains of Datasets
Often, data does not come out of nowhere, it is derived from other data. Therefore, datatomb is able to store a tree-like structure and every dataset usually has one or more "parent" datasets (There may be no parent when the data is freshly created / uploaded).

### Metadata and logging
Along with the data, some metadata is stored. Searching datasets is based on this metadata rather than searching in the datasets itself. Whenever a dataset is downloaded, a log of who and when downloaded the dataset is kept (it should be possible to disable this). The owner of a dataset can see the log. Make sure this is covered by your GDPR consent.

### Searching
All readable datasets are easily discoverable by searching through all metadata fields.

### Access controls
#### Roles and Permissions
Currently, there are only two roles: Owner / user and admin. The admin may do anything, normal users may push and download any dataset (even if it is not theirs!) and delete their own datasets. They may also see the access history of their own datasets. 

#### Private, internal and public datasets
Private datasets can only be downloaded and modified by their creators ("owners") and admins. Internal datasets can be downloaded by all authenticated users (but modified only by owners and admins) and public data sets may be downloaded by everybody without authentication.

## Server config
See the [config file for an example](config/config.yaml).

### server
  - `port` the port on which the server is listening for requests.
  - `datasetpath` the path where datasets are being stored.

### database
  - `host` hostname of the postgreSQL server.
  - `database` db name
  - `port`

Database secrets must be provided in environment variables `POSTGRES_USER` and `POSTGRES_PASSWORD`

### authentication
The key `kind` may either be `file` or `acrux`.

#### acrux
If an authentication server is used, the following fields must be set:

  - `url` full url of token endpoint of the authserver.
  - `usergroup` name of the group that is allowed to access datatomb
  - `admingroup` name of the group that administers datatomb

#### password based authentication
Instead of using the authentication server also simple password-based login is possible, mainly for testing. To this end, a user file must be maintained by an admin and referenced in the config: `userfile` (gives the path to the file). The file should have the following structure: 

```json
[
  "username": {
    "password": "passwordhash",
    "role": "user"
  },
  <...>
]
```
where username may be any well behaved string, password is a suitable password hash and role may be either `user` or `admin`.

**Note**: It is the admin's responsibility to ensure a transport security and appropriate hashing. This is meant mostly for testing and not for productive use!

## Authentication
Requests must contain a header with an access token issued by the auth server. datatomb validates this token and may cache the result for a certain period of time if successful. For this time frame, this token is valid.

For authentication, the header `Authorization: <token>` must be present. Note that some datasets may be public and no authentication is necessary to access these.

See "password based authentication" above for password logins. Also in this case the login credentials must be sent with the authorization header and base46 encoded. For example the following would generate a authorization header for a user `user` with a clear text password `1234`:

``` bash
echo -n "user,1234" | base64
```

## Installation
just run `npm install && npm start`.

To try it out, you can use the docker compose file which will set up the required postgres database automatically (but non-persistent!):

``` bash
podman-compose up
```
(or similarly `docker-compose up`). For rootless podman, make sure you have the dnsname plugin installed and activated for the networks. The datatomb server will be available at `localhost:8088`

## API endpoints
Everything below is prefixed with `/api/v1/`.

### `GET /meta/<hash>`
returns all metadata of `<hash>` as json object.

### `GET /meta/search?<query>[&properties=a,comma,separated,list]`
Returns a list of hashes (if properties is not given) or a vector of objects containing the metadata that is contained in the comma separated list of the properties query.

`query` may be any key-value pair combining
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

`properties` may contain any key that is contained in the metadata, this is currently 
`tags`, `name`, `projectname`, `description`, `share` and `data`. Additionally, `hash` is also allowed. In case the `properties` query is given, a list of objects (with every object contain) is returned instead of a list of hashes.

Example: `GET /meta/search?name=my_dataset&author=my_user&properties=hash,name,description` will return the same datasets as in the previous example but each element also contains the name and the description of the dataset.

### `GET /log/<hash>`
If you are the owner of the dataset `<hash>` (or admin), you may see the access history to that data set.
### `GET /<hash>`
downloads dataset, if you are allowed to.
### `POST /meta/update/<hash>`
updates the metadata of a dataset with hash `<hash>`, must be full metadata object as also used when uploading. Must only contain a `data` field (it is still multiform-post data).

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

### `GET /auth`
returns user name and other authdata if a valid token was provided. Note that there is no need to call this endpoint, it is just for checking authentication and getting user permissions (user, admin, etc)

### `GET /resolve/[id]`
returns a hash that is identified by `id`.

### Aliases

#### `POST /alias`
with the hash as payload (send a POST field `target`). returns a new and unique mnemonic.

Example:

``` sh
curl -v -X POST -H "Authorization: $token" -d 'target=39515f15' ${BASEURL}/alias
```
returns (may return)

``` json
{"alias":"polygon","hash":"39515f15a8b415c48babb6ede090c810a132ea9645c58fd9b973d6893178c139"}
```


#### `PUT /alias/[mnemonic]`
with the hash as payload. mnemonic need not but may exist. if it exists, the alias will be updated.

Example:

``` sh
curl -v -X PUT -H "Authorization: $token" -d 'target=39515f15' ${BASEURL}/alias/my_alias
```
returns

``` json
{"alias":"my_alias","hash":"39515f15a8b415c48babb6ede090c810a132ea9645c58fd9b973d6893178c139"}
```



#### `DELETE /alias/[mnemonic]` 
only allowed if the user is owner or admin of the alias

#### `GET /alias/[mnemonic][?time=2021-10-01T12:00:00]`
returns the hash the alias points to. If a time query is contained in the URL, resolves the alias to a given point in time.

#### `GET /alias/reverse/[hash][?time=2021-10-01T12:00:00]` 
reverse lookup of a hash, i.e. all mnemonics are returned that point to the hash. If a timestamp is contained as a query in the url, resolves the alias to a given point in time.

### webhooks
#### `GET /webhooks/<id>`
returns information about the webhook with id `<id>` if it is yours or you are admin.

#### `POST /webhooks/register`
register a new webhook:
```json
{
  "onTag": "tag",
  "onAuthor": "author",
  "url": "https://some.url/that/expects/post",
  "authenticate": true
}
```
and returns the id of the new webhook.

Either `onTag` or `onAuthor` may be `null`, but not both. If both are not-null, then the condition is "and"ed (i.e., the above example fires if `author` pushed a dataset with a tag `tag` but not if he/she pushed a dataset that does not contain the tag `tag` and also not if someone else pushed a dataset with the tag). There are no checks that `author` and `tag` really exists (both for privacy reasons and because the `tag` may only exist at a later point in time, namely when the data is being pushed).

If `authenticate` is set to `true`, the `POST` to `url` will contain the authentication token that was used to push the dataset (and the hook can run as the user that pushed the dataset and, in particular, also push results back to datatomb). If it is set to `false`, the token will be kept private.

`url` must be an url to which we can `POST` the following object:
```
{
  "hash": "<hash>",
  "hook": <webhookid>,
  "authtoken": "<authtoken>"
}
```
where `<hash>` is the dataset hash that can be used to retrieve the dataset itself and all metadata associated to it, `<webhookid>` is the id that can be used to retrieve information about the hook (and to delete it given there is a authtoken -- this enables one-shot hooks). `authtoken` will only be present (not null), if the hook has `authenticate` set to `true` and allows the receiving server to authenticate back to datatomb (e.g., to push results). In this case, the authentication header `Authorization` is also set to the authtoken to enable authentication for the service providing the hook endpoint itself.


#### `DELETE /webhooks/<id>`
removes the webhook with this id (if you are the owner or admin).

#### `GET /webhooks/list`
returns all ids of webhooks that are accessible to the user that are accessible to the user.

#### `GET /webhooks/auth`
updates the authtoken for all existing webhooks. Needs to be done when an authtoken is invalidated and a new one should be used from now on.

### Administrative tasks
special end points that need admin permissions.

#### `GET /admin/orphans`
returns a list of orphaned datasets, i.e., datasets that exist in the database and were not deleted but don't exist as a file.

#### `POST /admin/shred/<hash>`
delete all hints to a dataset (other than delete this also removes all metadata and log entries, but not tags)

#### `GET /admin/check/<hash>`
check if the dataset stored as `<hash>` still has the same checksum (may be important after storage instabilities).


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
  - table `webhooks(id primary, tag, author, authtoken, url, authenticate)`

## Auth server
uses the ldap-speaking [auth server](https://gitlab.spang-lab.de/containers/auth-server) for authentification. Authentification is granted based on two groups, defined in the authserver section of the config file. If the user is in the `usergroup`, he or she may up- and download datasets and history of his or her own datasets may be queried. If he or she is also in the admin group, history of foreign datasets is accessible and datasets can be deleted.
