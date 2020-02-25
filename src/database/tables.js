/* eslint-disable no-await-in-loop */
import { log } from '../util/index.js';

const tables = [
    {
        name: 'token',
        columns: ['id', 'key', 'token', 'type', 'data', 'created', 'lifetime'],
        create: (db) => db.none(`
            CREATE TABLE token (
                id              SERIAL              PRIMARY KEY NOT NULL,
                key             text                NOT NULL UNIQUE,
                token           CHAR(12)            NOT NULL UNIQUE,
                type            INTEGER             NOT NULL,
                data            JSON                NOT NULL,
                created         timestamptz         NOT NULL,
                lifetime        interval            
            );
        `),
    },
];


const tableExists = async (db, table) => {
    const query = `
        SELECT EXISTS (
            SELECT 1
            FROM   information_schema.tables 
            WHERE  table_name = $(name)
        );
    `;
    const res = await db.one(query, {
        name: table.name,
    });
    return res.exists;
};

const checkTable = async (db, table) => {
    log(`Checking Table ${table.name}...`);
    const exists = await tableExists(db, table);
    if (!exists) {
        log(`Table ${table.name} does not exist, creating it...`);
        await table.create(db);
        log('done.');
    }
    log(`Table ${table.name} ok.`);
};

export const initTables = async (db) => {
    log('Initializing tables...');
    for (let i = 0; i < tables.length; i += 1) {
        const table = tables[i];
        await checkTable(db, table);
    }
    log('done.');
};

export const getTable = (name) => tables.find((t) => t.name === name);
