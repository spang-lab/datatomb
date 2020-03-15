import createDatabase from './init.js';

let db = null;

export const getDb = (ctx) => {
    if (ctx && ctx.state.db) {
        return ctx.state.db;
    }
    if (!db) {
        throw new Error('db not created');
    }
    return db;
};
export const createDb = async () => {
    db = await createDatabase();
};
