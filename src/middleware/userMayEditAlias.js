// a user may edit an alias iff:
// - no current alias with that name exist, yet.
// - OR: an alias with that name exists and belongs to the user
// - OR: the user is an admin.
import {
    getDb,
    aliasExists,
    getAlias,
} from '../database/index.js';

export default async (ctx, next) => {
    const { mnemonic } = ctx.params;
    const { user, isAdmin } = ctx.state.authdata;
    const db = getDb();

    if (isAdmin || !await aliasExists(db)) {
        await next();
        return;
    }
    const aliasdata = await getAlias(db, mnemonic);
    if (aliasdata.owner === user) {
        await next();
        return;
    }
    ctx.throw(
        401,
        'user is not allowed to edit alias',
    );
    await next();
};
