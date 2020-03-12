/* eslint-disable no-await-in-loop */
import { log } from '../util/index.js';

const types = [
    {
        name: 'dsetoperation',
        create: (db) => db.none(`
            CREATE TYPE dsetoperation AS ENUM('created', 'read', 'deleted');
        `),
    }
];
const tables = [
    {
        name: 'tags',
        columns: ['id', 'name'],
        create: (db) => db.none(`
            CREATE TABLE tags (
                id              SERIAL              PRIMARY KEY NOT NULL,
                name            text                UNIQUE NOT NULL
            );
        `),
    },
    {
        name: 'datagenerators',
        columns: ['id', 'kind', 'instance', 'ref'],
        create: (db) => db.none(`
            CREATE TABLE datagenerators(
                id              SERIAL              PRIMARY KEY NOT NULL,
                kind            text                NOT NULL,
                instance        text                NOT NULL,
                ref             text,
                CONSTRAINT unique_datagenerators UNIQUE(kind, instance, ref)
            );
        `),
    },
    {
        name: 'datasets',
        columns: ['id', 'hash', 'name', 'projectname', 'description', 'data', 'generator'],
        create: (db) => db.none(`
            CREATE TABLE datasets(
                id              SERIAL              NOT NULL PRIMARY KEY,
                hash            text                NOT NULL,
                name            text                NOT NULL,
                projectname     text,
                description     text,
                data            JSON,
                generator       SERIAL              NOT NULL REFERENCES datagenerators(id)
            );
        `),
    },
    {
        name: 'log',
        columns: ['id', 'operation', 'who', 'time', 'dataset' ],
        create: (db) => db.none(`
            CREATE TABLE log(
                id              SERIAL              PRIMARY KEY NOT NULL,
                operation       dsetoperation       NOT NULL,
                who             text                NOT NULL,
                time            timestamp with time zone NOT NULL,
                dataset         INT                 NOT NULL REFERENCES datasets(id)
            );
        `),
    },
    {
        name: 'parentdatasets',
        columns: ['child', 'parent'],
        create: (db) => db.none(`
            CREATE TABLE parentdatasets(
                child           INT                 NOT NULL REFERENCES datasets(id),
                parent          INT                 NOT NULL REFERENCES datasets(id),
                CONSTRAINT pk_parentdatasets PRIMARY KEY (child, parent)
            );
        `),
    },
    {
        name: 'datasettags',
        columns: ['dataset', 'tag'],
        create: (db) => db.none(`
            CREATE TABLE datasettags (
                dataset         INT                 NOT NULL REFERENCES datasets(id),
                tag             INT                 NOT NULL REFERENCES tags(id),
                CONSTRAINT pk_datasettags PRIMARY KEY (dataset, tag)
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

const typeExists = async (db, type) => {
    const query = `
        SELECT EXISTS (
            SELECT 1
            FROM   pg_type
            WHERE  typname = $(name)
        );
    `;
    const res = await db.one(query, {
        name: type.name,
    });
    return res.exists;
};

const initTable = async (db, table) => {
    log(`Checking Table ${table.name}...`);
    const exists = await tableExists(db, table);
    if (!exists) {
        log(`Table ${table.name} does not exist, creating it...`);
        await table.create(db);
        log('done.');
    }
    log(`Table ${table.name} ok.`);
};
const initType = async (db, type) => {
    log(`Checking Type ${type.name}...`);
    const exists = await typeExists(db, type);
    if (!exists) {
        log(`Type ${type.name} does not exist, creating it...`);
        await type.create(db);
        log('done.');
    }
    log(`Type ${type.name} ok.`);
};

export const initTypes = async (db) => {
    log('Initializing types...');
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        await initType(db, type);
    }
    log('done.');
};
export const initTables = async (db) => {
    log('Initializing tables...');
    for (let i = 0; i < tables.length; i += 1) {
        const table = tables[i];
        await initTable(db, table);
    }
    log('done.');
};

export const getTable = (name) => tables.find((t) => t.name === name);
