/* eslint-disable no-await-in-loop */
import pgPromise from 'pg-promise';
import {
    log,
    getConfig
} from '../util/index.js';

const state = {
    pgp: null,
    connection: null,
    isReady: false,
};

const delay = (ms = 1000) => new Promise(r => setTimeout(r, ms));

const logQuery = ev => log(`QUERY: ${ev.query}`);
const logReceive = data => log(`Recieved ${data.length} rows.`);

const isReady = async () => {
    try {
        const client = await state.connection.connect();
        client.done();
        log('Database ready to receive connections...');
        return true;
    } catch (err) {
        log('--- Database not ready. Error:');
        log(err);
        log('-----------------------');
        return false;
    }
};

export const connect = async () => {
    const config = getConfig();
    const db = config.database;
    const { POSTGRES_USER : postgresUser,
            POSTGRES_PASSWORD : postgresPassword,
            DEBUG : debug }
          = config.secrets;
    log(`
        Host: ${db.host},
        Database: ${db.database}
        Port: ${db.port}
    `);
    const initOptions = {};
    if (debug.includes('database')) {
        initOptions.query = logQuery;
        initOptions.receive = logReceive;
    }
    log('Initializing Database connection...');
    state.pgp = pgPromise(initOptions);
    const opts = {
        ...db,
        user: postgresUser,
        password: postgresPassword,
    };
    state.connection = state.pgp(opts);

    while (!await isReady()) {
        log('Waiting for database connection...');
        await delay(5000);
    }
    state.isReady = true;
};


export const getConnection = () => {
    if (!state.connection || !state.isReady) {
        throw new Error(`Trying to obtain a connection before the database
            has been initalized.`);
    }
    return state.connection;
};
