import { log } from '../util/index.js';
import pgPromise from 'pg-promise';
const pgp = pgPromise({capSQL: true});

const queryCommands = (key, val) => {
    const v = pgp.as.text(val);
    switch(key.toLowerCase()) {
    case 'any':
        return `((description like ${v}) OR (tags like ${v}) OR (data like ${v}))`;
        break;
    case 'name':
        return `name like ${v}`;
        break;
    case 'creator':
        return `creator = ${v}`;
        break;
    case 'tag':
        return `tag = ${v}`;
        break;
    case 'description':
        return `description like ${v}`;
        break;
    default:
        throw(`unknown search query "${key}"`);
    };
};
const queryToSqlQuery = (query) => {
    var res = 'select hash from datasets where ';

    res += Object.keys(query).map((key) => {
        const v = query[key.toLowerCase()];
        if( Array.isArray(v) )
            return v.map( (value) => { return queryCommands(key, value); }).join(' AND ');
        else
            return queryCommands(key, v);
    }).join(' AND ');
    res += ";";
    return res;
};
export const search = (ctx) => {
    log(queryToSqlQuery(ctx.request.query));
    // getDb(ctx).
    ctx.body = '1';
};
