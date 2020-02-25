
import createDatabase from './init.js';

let db = null;

export const get = (ctx) => {
    if (ctx && ctx.state.db) {
        return ctx.state.db;
    }
    return db;
};
export const create = async () => {
    db = await createDatabase();
};
