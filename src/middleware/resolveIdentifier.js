import {
    getDb, hashesLike,
} from '../database/index.js';

export default async (ctx, next) => {
    const { dsetid } = ctx.params;
    ctx.assert(dsetid,
        500,
        'no dsetid in context.');
    const reFull = /^[0-9a-f]{64}$/;
    const reSplit = /^([0-9a-f]+)(\.[a-z]*)?/;
    const [, id, ext] = dsetid.match(reSplit);
    ctx.params.filesuffix = ext;
    if (id.match(reFull)) {
        ctx.params.hash = id;
    } else {
        // no exact match
        // find hashes that have dsetid as a substring
        const db = getDb(ctx);
        const matches = await hashesLike(db, id);
        if (matches.length === 0) {
            ctx.throw(404, `no hash matches abbreviated id ${id}`);
        } else if (matches.length > 1) {
            ctx.throw(400, `Abbreviated id ${id} is ambiguous.`);
        } else {
            [ctx.params.hash] = matches;
            ctx.params.abbrev = id;
        }
    }
    await next();
};
