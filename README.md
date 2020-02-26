# datatomb

HTTP server for storing data sets.

## idea
This server is a data- and metadataprovider for [glacier](https://gitlab.spang-lab.de/jsimeth/glacier). It accepts dataset up- and downloads by authenticated users. 

### Immutability
It is important to realize that data sets are immutable once they have been published. This is necessary to ensure the integrity of downstream analyses. Therefore, there are only two roles: creating datasets and reading datasets. Deletion will be possible but is only intended to remove entire chains of datasets or orphaned datasets. It is not possible to modify datasets (also not their metadata), if such a modified dataset is necessary, it has to be uploaded as a new dataset (and future analysis must be based on this new dataset).

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
  - `port`
  - `datasetpath`

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
  - `child=<hash>`: returns all parents of `hash`
  
Several conditions are AND-connected.

TODO: anything else??
### `/accessed/<hash>`
If you are the owner of the dataset `<hash>` (or admin), you may see the access history to that data set.
### `/get/<hash>`
downloads dataset
### `/publish/<hash>`
uploads dataset
### `/rm`
If you are the owner of a dataset or admin (TODO: maybe don't allow this?!?! maybe only admin may?), you may remove your published data sets.
### `/healthy`
return 1 if healthy.

## Database schema
  - table `tags(name primary unique)`
  - table `users(name primary unique)` (TODO: is this even necessary or do we entirely rely on the authserver for this? What happens if users there get deleted?)
  - table `access(id primary, user => users.id, timestamp, dataset => datasets.hash)`
  - table `datasets(hash primary unique, name, parents => datasets.hash, tags => [tags.id], description, creator => users.id, timestamp, readGroups, adminGroups, readUsers, adminUsers)`
  the fields `readGroups, adminGroups, readUsers, adminUsers` are created but initialized to `config.usergroup`, `config.admingroup`, <empty> and <empty> for future implementation of a role / permission system.

## Auth server
uses the ldap-speaking [auth server](https://gitlab.spang-lab.de/containers/auth-server) for authentification. Authentification is granted based on two groups, defined in the authserver section of the config file. If the user is in the `usergroup`, he or she may up- and download datasets and history of his or her own datasets may be queried. If he or she is also in the admin group, history of foreign datasets is accessible and datasets can be deleted.
