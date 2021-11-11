import fetch from 'node-fetch';
import {
    log,
} from './logger.js';

const isInGroup = (userdata, groupname) => {
    log(userdata);
    const res = userdata.grouplist.find((g) => (g === groupname));
    if (res) {
        return true;
    }
    return (false);
};
export default async (authserverconfig, authtoken) => {
    if (authtoken) {
        const { url, usergroup, admingroup } = authserverconfig;
        const userinfourl = `${url}/user/info`;

        log(`contacting authserver ${userinfourl}`);
        const response = await fetch(userinfourl, {
            method: 'get',
            headers: {
                Authorization: authtoken,
            },
        }).then((res) => res.json());

        if (typeof response.ok !== 'undefined' && !response.ok) {
            if (response.error) {
                throw new Error(`authserver returned: ${response.error}`);
            } else {
                throw new Error('authserver returned generic error.');
            }
        }
        const userdata = response.data;

        log(`user ${userdata.sub} authenticated.`);

        return ({
            user: userdata.sub,
            isAdmin: isInGroup(userdata, admingroup),
            isUser: isInGroup(userdata, usergroup),
            authenticated: true,
        });
    }
    return ({
        user: 'anonymous',
        isAdmin: false,
        isUser: false,
        authenticated: false,
    });
};
