import { connect, getConnection } from './connection.js';
import { initTables, initTypes } from './tables.js';
import { log } from '../util/index.js';

const init = async () => {
    log('Initializing database...');
    await connect();
    log('connected.');
    const db = getConnection();
    log('have connection.');
    await initTypes(db);
    log('inited types.');
    await initTables(db);
    log('inited tables.');
    log('Done.');
    return db;
};
export default init;
