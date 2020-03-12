import {
    log,
    getConfig
} from '../util/index.js';
import fetch from 'node-fetch';

const isInGroup = function(userdata, groupname) {
    return(false);
}
export default async (ctx, next) => {
    // TODO: fill with actual auth data.
    const authtoken = ctx.header.authorization;
    if( ! authtoken ) {
        throw(new Error('no auth token in header.'));
    }

    const config = getConfig();
    const { url, usergroup, admingroup} = config.authserver;

    log(usergroup);

    log(`contacting authserver ${url}`);
    const userdata = await fetch(url, {
        method: 'post',
        body:    JSON.stringify({token: authtoken}),
        headers: { 'Content-Type': 'application/json' },
    }).then(res => res.json());

    console.log(userdata);

    if( ! isInGroup(usergroup) ) {
        throw(new Error(`User ${userdata.sub} is not allowed to access datatomb.`));
    }

    ctx.state.authdata = {
        user: userdata.sub,
        isAdmin: isInGroup(userdata, admingroup)
    };
    await next();
};
