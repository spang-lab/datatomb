# datatomb

HTTP server for data sets.

## Server config
### server
  - `port`

### database
  - `host`
  - `database`
  - `port`

Database secrets are stored in environment variables `POSTGRES_USER` and `POSTGRES_PASSWORD`

### authserver
  - `host`
  - `port`
  - `usergroup`
  - `admingroup`

## API endpoints
Below is prefixed with `/api/v1/`.

### `/token/<username>`
returns a valid token for `<username>`. Need to have a valid ssh key pair and the public key must be known to the auth server.
TODO: think about the process and document.

### `/meta/<hash>`
If nothing else is given, returns all metadata of `<hash>` as json object.
### `/search/<query>`
returns a list of hashes. `query` may be any key-value pair combining
  - `any`: free text search in all fields
  - `creator`: datasets authored by some specific user
  - `tag`: dataset has tag attached
  - `description`: free text search in description field
  - `after`: created after some time point (unix time)
  - `before`: created before some time point (unix time)
  - `lastAccessBefore`: last access before some time point (unix time). Only available for admins and mainly used to identify deletion candidates

TODO: anything else??
### `/accessed/<hash>`
If you are the owner of the dataset `<hash>` (or admin), you may see the access history to that data set.
### `/get/<hash>`
downloads dataset
### `/push/<hash>`
uploads dataset
### `/rm`
If you are the owner of a dataset or admin (TODO: maybe don't allow this?!?! maybe only admin may?), you may remove your published data sets.
### `/healthy`
return 1 if healthy.

## Database schema
table `tags(id primary, name)`
table `users(id primary, name)`
table `access(id primary, user => users.id, timestamp, dataset => datasets.id)`
table `datasets(id primary, hash, tags => [tags.id], description, creator => users.id, timestamp)`

## Auth server
uses the ldap-speaking [auth server](https://gitlab.spang-lab.de/containers/auth-server) for authentification. Authentification is granted based on two groups, defined in the authserver section of the config file. If the user is in the `usergroup`, he or she may up- and download datasets and history of his or her own datasets may be queried. If he or she is also in the admin group, history of foreign datasets is accessible and datasets can be deleted.
