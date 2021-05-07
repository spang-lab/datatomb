export const updateAuth = async (db, user, token) => db.none('INSERT INTO webhookauth(username, token) VALUES($/username/, $/token/) ON CONFLICT(username) DO UPDATE SET token = $/token/;', { username: user, token });

export const getAuth = async (db, id) => db.any('SELECT token FROM webhookauth WHERE username = (SELECT username FROM webhooks WHERE id = $1)', id).then((arr) => { if (arr.length > 0) { return arr[0].token; } return (null); });

export const getUserToken = async (db, uname) => db.any('SELECT token FROM webhookauth WHERE username = $1', uname).then((arr) => { if (arr.length > 0) { return arr[0].token; } return (null); });

export const getOwner = async (db, id) => db.any('SELECT owner FROM webhooks WHERE id = $1', id).then((arr) => { if (arr.length > 0) { return arr[0].owner; } return (null); });

export const exists = async (db, id) => db.one('SELECT COUNT(id) FROM webhooks WHERE id = $1', id, (cnt) => (cnt));

export const add = async (db, hook, user) => db.one('INSERT INTO webhooks(tag, author, owner, url, authenticate) VALUES($/tag/, $/author/, $/owner/, $/url/, $/authenticate/) RETURNING id;',
    {
        tag: hook.onTag,
        author: hook.onAuthor,
        owner: user,
        url: hook.url,
        authenticate: hook.authenticate,
    }, (t) => t.id);

export const get = async (db, id) => db.any('SELECT * FROM webhooks where id = $1;', id, (row) => ({
    onTag: row.tag,
    onAuthor: row.author,
    owner: row.owner,
    url: row.url,
    authenticate: row.authenticate,
})).then((arr) => { if (arr.length > 0) { return arr[0]; } return (null); });

export const listUser = async (db, user) => db.map('SELECT id FROM webhooks WHERE owner = $1;', user, (row) => (row.id));
export const listAll = async (db) => db.map('SELECT id FROM webhooks;', undefined, (row) => (row.id));
export const delHook = async (db, id) => db.none('DELETE FROM webhooks WHERE id = $1;', id);

export const listMatching = async (db, author, taglist) => {
    // convert taglist to string:
    if (taglist.length === 0) {
        return (db.map('SELECT id FROM webhooks WHERE (author = $1 OR author IS NULL);', author, (row) => (row.id)));
    }
    const tagstr = `(${taglist.map((str) => `'${str}'`).join(',')})`;
    console.log(tagstr);
    // avoid escaping of tagstr:
    return (db.map(`SELECT id FROM webhooks WHERE (tag in ${tagstr} OR tag IS NULL) AND (author = $1 OR author IS NULL);`, author, (row) => (row.id)));
};
