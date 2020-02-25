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
    {
        name: 'account',
        columns: ['id', 'sub', 'name', 'given_name', 'family_name', 'middle_name', 'nickname', 'preferred_username', 'profile', 'picture', 'website', 'email', 'email_verified', 'gender', 'birthdate', 'zoneinfo', 'locale', 'phone_number', 'phone_number_verified', 'address', 'updated_at', 'password', 'linux_id', 'last_login'],
        create: (db) => db.none(`
            CREATE TABLE account (
                id                      SERIAL       PRIMARY KEY NOT NULL,
                sub                     text         NOT NULL UNIQUE,
                name                    text         NOT NULL,
                given_name              text         ,
                family_name             text         ,
                middle_name             text         ,
                nickname                text         ,
                preferred_username      text         ,
                profile                 text         ,
                picture                 text         ,
                website                 text         ,
                email                   text         NOT NULL UNIQUE,
                email_verified          boolean      ,
                gender                  text         ,
                birthdate               date         ,
                zoneinfo                text         ,
                locale                  text         ,
                phone_number            text         ,
                phone_number_verified   boolean      ,
                address                 JSON         ,
                updated_at              timestamptz  NOT NULL,
                password                CHAR(60)     NOT NULL,
                linux_id                SERIAL       NOT NULL UNIQUE,
                last_login              timestamptz  
            );
        `),
    },
    {
        name: 'accountkeys',
        columns: ['id', 'account', 'type', 'key'],
        create: (db) => db.none(`
            CREATE TABLE accountkeys (
                id              SERIAL              PRIMARY KEY NOT NULL,
                account         INTEGER             NOT NULL REFERENCES account(id),
                type            text                NOT NULL,
                key             text                NOT NULL
            );
        `),
    },
    {
        name: 'permission',
        columns: ['id', 'name', 'gid'],
        create: (db) => db.none(`
            CREATE TABLE permission (
                id              SERIAL              PRIMARY KEY NOT NULL,
                name            VARCHAR(128)        NOT NULL UNIQUE,
                gid             INTEGER             NOT NULL UNIQUE
            );
        `),
    },
    {
        name: 'accountpermission',
        columns: ['id', 'permission', 'account'],
        create: (db) => db.none(`
            CREATE TABLE accountpermission(
                id              SERIAL              PRIMARY KEY NOT NULL,
                permission      INTEGER             NOT NULL REFERENCES permission(id),
                account         INTEGER             NOT NULL REFERENCES account(id),
                UNIQUE (permission, account)
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
