import {
    log,
    getConfig
} from '../util/index.js';
import fetch from 'node-fetch';

const isInGroup = function(userdata, groupname) {
    const res = userdata.groups.find((g) => {return (g.name === groupname);});
    if( res ){
        return true;
    } else {
        return(false);
    }
}
export default async (ctx, next) => {
    const authtoken = ctx.header.authorization;

    if( authtoken ) {
        log(`querying authtoken = ${authtoken}`);
        const config = getConfig();
        const { url, usergroup, admingroup} = config.authserver;

        log(`contacting authserver ${url}`);
        const userdata = await fetch(url, {
            method: 'post',
            body:    JSON.stringify({token: authtoken}),
            headers: { 'Content-Type': 'application/json' },
        })
        .then(res => res.json());

        console.log(userdata);

        ctx.state.authdata = {
            user: userdata.sub,
            isAdmin: isInGroup(userdata, admingroup),
            isUser: isInGroup(userdata, usergroup),
            authenticated: true
        };
        console.log(ctx.state.authdata);
    } else {
        log(`anonymous access`);
        ctx.state.authdata = {
            user: 'anonymous',
            isAdmin: false,
            isUser: false,
            authenticated: false
        };
    }
    await next();
};
