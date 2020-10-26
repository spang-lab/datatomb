import fetch from 'node-fetch';
import {
    log, getConfig,
    authenticate,
} from '../util/index.js';
import {
    getDb,
    addWebhook,
    listAllWebhooks,
    listUsersWebhooks,
    delWebhook,
    getWebhook as getWebhookFromDb,
    updateWebhookAuth,
    getWebhookUserToken,
    mayRead,
    listMatchingWebhooks,
} from '../database/index.js';


export const updateHookAuth = async (ctx) => {
    const owner = ctx.state.authdata.user;
    ctx.assert(owner, 401, 'anonymously registering an webhook is not possible.');
    const db = getDb();
    const token = ctx.header.authorization;
    ctx.assert(token, 401, 'no auth token provided');
    await updateWebhookAuth(db, owner, token);
};

const isValidUrl = (url) => {
    // eslint-disable-next-line
    const regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
    return (regex.test(url));
};
export const registerWebhook = async (ctx) => {
    const owner = ctx.state.authdata.user;
    ctx.assert(owner, 401, 'anonymously registering an webhook is not possible.');
    log('registering a new webhook');

    const hook = ctx.request.body;
    ctx.assert(hook.url, 400, 'hook does not contain the url to post to.');
    ctx.assert(isValidUrl(hook.url), 400, 'hook url is not valid (note: needs to be prefixed with http(s))');
    if (!hook.authenticate) {
        hook.authenticate = false;
    }
    ctx.assert(hook.onTag || hook.onAuthor, 400, 'at least one of onTag or onAuthor must be given.');

    log(hook);
    const db = getDb();
    const token = ctx.header.authorization;
    ctx.assert(token, 401, 'no auth token provided');
    await updateWebhookAuth(db, owner, token);
    const id = await addWebhook(db, hook, owner);
    ctx.response.body = id;
};
export const getWebhook = async (ctx) => {
    const { id } = ctx.params;
    // we know that the webhook exists
    // (because it has been checked when the user permissions were checked.)
    log(`get webhook ${id}`);
    ctx.assert(id, 500, 'no webhook id in context.');
    const db = getDb();
    ctx.response.body = await getWebhookFromDb(db, id);
};
export const listWebhooks = async (ctx) => {
    log('listWebhooks.');
    const owner = ctx.state.authdata.user;
    ctx.assert(owner, 401);
    const { isAdmin } = ctx.state.authdata;
    const db = getDb();
    if (isAdmin) {
        log('listing all webhooks.');
        ctx.response.body = await listAllWebhooks(db);
    } else {
        log(`listing user's webhooks. (user: ${owner})`);
        ctx.response.body = await listUsersWebhooks(db, owner);
    }
};
export const deleteWebhook = async (ctx) => {
    const { id } = ctx.params;
    // we know that the webhook exists
    // (because it has been checked when the user permissions were checked.)
    log(`delete webhook ${id}`);
    ctx.assert(id, 500, 'no webhook id in context.');
    const db = getDb();
    await delWebhook(db, id);
    ctx.response.status = 200;
};
export const executeWebhooks = async (ctx) => {
    const author = ctx.state.authdata.user;
    ctx.assert(author, 401, 'anonymous webhooks are not possible.');
    const authortoken = ctx.header.authorization;
    ctx.assert(authortoken, 500, 'no authtoken in the header.');
    const { hash } = ctx.state;
    ctx.assert(hash, 500, 'hash not set when calling executeWebhooks.');
    const { meta } = ctx.state;
    ctx.assert(hash, 500, 'metadata not set when calling executeWebhooks.');
    const config = getConfig();
    ctx.assert(config.authserver,
        500,
        'auth server not configured.');

    // find webhooks that fit:
    const db = getDb();
    const hookids = await listMatchingWebhooks(db, author, meta.tags);

    const hooks = await Promise.all(hookids.map((id) => getWebhookFromDb(db, id)));


    // get all hookowners for authentication
    let hookowners = new Set(hooks.map((hook) => (hook.owner)));
    // remove author from the set (we have the authdata already)
    hookowners.delete(author);
    hookowners = Array.from(hookowners);

    // get all authdata
    const allauthdata = new Map(
        await Promise.all(hookowners.map(async (uname) => {
            const token = await getWebhookUserToken(db, uname);
            console.log(token);
            try {
                const authdata = await authenticate(config.authserver, token);
                authdata.token = token;
                return ([uname, authdata]);
            } catch( exc ) {
                log(`error authenticating ${uname}: ${exc}`);
                return ([uname, undefined]);
            }
        })),
    );
    // add the known authdata of the author:
    const { authdata } = ctx.state;
    authdata.token = authortoken;
    allauthdata.set(author, authdata);

    // finally run all matching hooks
    const success = await Promise.all(Array.from(hooks.entries()).map(async (pair) => {
        const hook = pair[1];
        const thisauthdata = allauthdata.get(hook.owner);
        let readable;
        try {
            readable = await mayRead(db, thisauthdata, hash);
        } catch (err) {
            return false;
        }
        if (readable) {
            // process hook
            const hookdata = {
                hash,
                hook: hook.id,
            };
            const headers = { 'Content-Type': 'application/json' };
            if (hook.authenticate) {
                // set the token both in the header and the body itself
                hookdata.authtoken = thisauthdata.token;
                headers.Authorization = thisauthdata.token;
            }
            // send it:
            return fetch(hook.url, {
                method: 'post',
                body: JSON.stringify(hookdata),
                headers,
            }).then((res) => {
                if (res.ok) {
                    return (true);
                }
                log(`error posting webhook ${hook.id}: fetch returned:`);
                log(res);
                return (false);
            }).catch((err) => { log(`webhook ${hook.id} returned error: ${err}`); });
        }
        log(`dataset ${hash} is not readable for the (matching) hook owner ${thisauthdata.user}`);
        return false;
    }));
    log('webhooks executed:');
    log(hookids);
    log('successful:');
    log(success);
};
