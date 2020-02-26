import { connect, getConnection } from './connection.js';
import { initTables, initTypes } from './tables.js';
import { log } from '../util/index.js';


const init = async () => {
    log('Initializing database...');
    await connect();
    const db = getConnection();
    await initTypes(db);
    await initTables(db);
    log('Done.');
    return db;
};
export default init;
