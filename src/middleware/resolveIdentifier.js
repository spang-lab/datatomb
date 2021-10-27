import {
    getDb, hashesLike,
    aliasExists, getAlias,
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
        // no exact match. go through what we have
        const db = getDb(ctx);
        //
        // it may be a alias:
        if (await aliasExists(db, id)) {
            const { hash } = await getAlias(db, id);
            ctx.params.hash = hash;
            ctx.params.abbrev = id;
        } else {
            // it is not a alias, find similar (abbreviated) hashes
            // find hashes that have dsetid as a substring
            const matches = await hashesLike(db, id, true);
            if (matches.length === 0) {
                ctx.throw(404, `no hash matches abbreviated id ${id}`);
            } else if (matches.length > 1) {
                ctx.throw(400, `Abbreviated id ${id} is ambiguous.`);
            } else {
                [ctx.params.hash] = matches;
                ctx.params.abbrev = id;
            }
        }
    }
    await next();
};
