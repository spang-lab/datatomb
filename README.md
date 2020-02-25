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

## API endpoints
### `/token/<username>`
returns a valid token for `<username>`. Need to have a valid ssh key pair and the public key must be known to the auth server.
TODO: think about the process and document.

### `/meta/<hash>`
If nothing else is given, returns all metadata of `<hash>`. May be limited to a single field by supplying a `only`-key, e.g. `only=tags` or so. Permissible keys are all columns of the `datasets` table.
### `/search/<query>`
where query may be any key-value pair combining
  - `any`: free text search in all fields
  - `creator`: datasets authored by some specific user
  - `tag`: dataset has tag attached
  - `description`: free text search in description field
  - `after`: created after some time point (unix time)
  - `before`: created before some time point (unix time)
TODO: anything else??
### `/accessed/<hash>`
If you are the owner of the dataset `<hash>` (or admin), you may see the access history to that data set.
### `/get/<hash>`
downloads dataset
### `/push/<hash>`
uploads dataset
### `/healthy`
return 1 if healthy.

## Database schema
table `tags(id primary, name)`
table `users(id primary, name)`
table `access(id primary, user => users.id, timestamp, dataset => datasets.id)`
table `datasets(id primary, hash, tags => [tags.id], description, creator => users.id, timestamp)`
