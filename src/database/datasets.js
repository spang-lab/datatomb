import { log, datasetFileExists } from '../util/index.js';
import { getDb } from './getdb.js';

export const metadataExists = async (db, hash) => {
    const result = await db.one('SELECT count(*) FROM datasets where hash = $/hash/', { hash });
    return (result.count > 0); // there may be more than 1 dataset with that hash (historical data)
};
export const exists = async (ctx, hash) => {
    const db = getDb();
    const mdata = metadataExists(db, hash);
    const fexists = await datasetFileExists(ctx, hash);
    return (await mdata) && fexists;
};
// returns all hashes that have `id` as a substring
export const hashesLike = async (db, id, includeDeleted = false) => {
    if (includeDeleted) {
        return (db.map('SELECT DISTINCT(hash) FROM datasets WHERE hash LIKE $1', [`%${id}%`], (m) => m.hash));
    }
    return (db.map('SELECT DISTINCT(hash) FROM datasets WHERE id in (SELECT DISTINCT(dataset) FROM log WHERE operation != \'deleted\') AND hash LIKE $1', [`%${id}%`], (m) => m.hash));
};

export const allNonDeletedDatasets = async (db) => db.map('SELECT DISTINCT(hash) FROM datasets where id in (SELECT DISTINCT(dataset) FROM log WHERE operation != \'deleted\');', [], (h) => h.hash);

export const getCreator = async (db, hash) => {
    if (!await exists(db, hash)) {
        throw new Error(`no dataset for hash ${hash}`);
    }
    return db.one('SELECT who FROM log WHERE dataset = (SELECT MAX(id) FROM datasets WHERE hash = $1) AND operation = $2', [hash, 'created'], (u) => u.who);
};

export const DatasetState = {
    UNKNOWN: 0,
    CREATED: 1,
    DELETED: 2,
};
export const getState = async (db, hash) => {
    // returns "created" or "deleted", whichever is the more recent operation on the dataset
    const r = await db.oneOrNone('SELECT operation FROM log WHERE dataset=(select MAX(id) from datasets where hash=$1) AND (operation = \'created\' OR operation = \'deleted\') ORDER BY id DESC LIMIT 1;', [hash], (c) => {
        if (!c) {
            return ('unknown');
        }
        return (c.operation);
    });
    if (r === 'created') {
        return (DatasetState.CREATED);
    } if (r === 'deleted') {
        return (DatasetState.DELETED);
    }
    return (DatasetState.UNKNOWN);
};

export const getShareState = async (db, hash) => {
    if (!await exists(db, hash)) {
        throw (new Error(`no dataset for hash ${hash}`));
    }
    return db.one('SELECT share FROM datasets WHERE id = (SELECT MAX(id) FROM datasets WHERE hash = $1)', hash, (s) => s.share);
};

export const mayRead = async (db, authdata, hash) => {
    // if the dataset was deleted then we also cannot read it.
    if (!await exists(db, hash)) {
        return false;
    }
    if (authdata.isAdmin) {
        log(`admin access for ${authdata.user}`);
        return true;
    }
    const share = await getShareState(db, hash);

    log(`access to ${hash} is ${share}.`);

    if (share === 'public') {
        return true;
    } if (share === 'internal') {
        if (authdata.isUser) {
            return true;
        }
        return false;
    } if (share === 'private') {
        const owner = await getCreator(db, hash);

        if (owner === authdata.user) {
            return true;
        }
        return false;
    }
    throw (new Error('unknown sharestate.'));
};

const getInsertTagId = (db, tag) => db.task('getInsertTagId', (t) => t.oneOrNone('SELECT id FROM tags WHERE name = $1', tag, (t1) => t1 && t1.id)
    .then((tagId) => tagId || t.one('INSERT INTO tags(name) VALUES($1) RETURNING id', tag, (t2) => t2.id)));

const getInsertDataGeneratorId = (db, datagen) => db.task('getInsertDataGeneratorId', (t) => {
    if (datagen.ref) {
        return t.oneOrNone('SELECT id FROM datagenerators WHERE kind = $1 AND instance = $2 AND ref = $3', [datagen.kind, datagen.instance, datagen.ref], (t1) => t1 && t1.id)
            .then((id) => id || t.one('INSERT INTO datagenerators(kind, instance, ref) VALUES($1, $2, $3) RETURNING id', [datagen.kind, datagen.instance, datagen.ref], (t2) => t2.id));
    }
    return t.oneOrNone('SELECT id FROM datagenerators WHERE kind = $1 AND instance = $2 AND ref IS NULL', [datagen.kind, datagen.instance], (t1) => t1 && t1.id)
        .then((id) => id || t.one('INSERT INTO datagenerators(kind, instance) VALUES($1, $2) RETURNING id', [datagen.kind, datagen.instance], (t2) => t2.id));
});

const updateDataset = (db, hash, metadata, dgenid) => db.one('UPDATE datasets SET name = $/name/, projectname = $/projectname/, description=$/description/, data=$/data/, generator=$/dgenid/, share=$/share/ WHERE id = (SELECT max(id) FROM datasets WHERE hash = $/hash/) RETURNING id;',
    {
        hash,
        name: metadata.name,
        projectname: metadata.projectname,
        description: metadata.description,
        data: metadata.data,
        dgenid,
        share: metadata.share,
    }, (t) => t.id);
const getInsertDatasetId = (db, hash, metadata, dgenid) => db.one('INSERT INTO datasets(hash, name, projectname, description, data, generator, share) VALUES($/hash/, $/name/, $/projectname/, $/description/, $/data/, $/dgenid/, $/share/) RETURNING id;',
    {
        hash,
        name: metadata.name,
        projectname: metadata.projectname,
        description: metadata.description,
        data: metadata.data,
        dgenid,
        share: metadata.share,
    }, (t) => t.id);

export const add = async (db, hash, metadata) => {
    log(`add dataset ${hash} to db.`);

    // generate tags:
    const tagids = await Promise.all(metadata.tags.map((tag) => getInsertTagId(db, tag)));
    // genetare datagenerator:
    const datagenid = await getInsertDataGeneratorId(db, metadata.generator);
    // generate data set itself:
    const dsetid = await getInsertDatasetId(db, hash, metadata, datagenid);
    // if there is a parent, generate the relation to it:
    if (metadata.parents) {
        let parents = null;
        if (Array.isArray(metadata.parents)) {
            parents = metadata.parents;
        } else {
            parents = [metadata.parents];
        }
        const p = parents.map((parenthash) => db.none('INSERT INTO parentdatasets(child, parent) VALUES($/thisdset/, (SELECT MAX(id) FROM datasets where hash = $/parenthash/))', { thisdset: dsetid, parenthash }));
        await Promise.all(p);
    }

    // add tags to the dataset:
    await Promise.all(tagids.map((id) => db.none('INSERT INTO datasettags(dataset, tag) VALUES($/thisdset/, $/tagid/) ON CONFLICT DO NOTHING', { thisdset: dsetid, tagid: id })));
};

const getTags = async (db, hash) => db.map('SELECT name FROM tags WHERE id IN (SELECT tag FROM datasettags WHERE dataset = (SELECT max(id) FROM datasets WHERE hash = $1))', hash, (row) => row.name);

export const update = async (db, hash, metadata) => {
    log(`update metadata for dataset ${hash}.`);

    const oldTags = await getTags(db, hash);
    const newTags = new Set(metadata.tags);
    const tagsToDelete = oldTags.filter((tag) => !newTags.has(tag));

    // generate tags:
    const newtagids = await Promise.all([...newTags].map((tag) => getInsertTagId(db, tag)));
    const tagIdsToDelete = await Promise.all(tagsToDelete.map((tag) => getInsertTagId(db, tag)));
    // genetare datagenerator:
    const datagenid = await getInsertDataGeneratorId(db, metadata.generator);
    // generate data set itself:
    const dsetid = await updateDataset(db, hash, metadata, datagenid);
    // if there is a parent, generate the relation to it:
    if (metadata.parents) {
        let parents = null;
        if (Array.isArray(metadata.parents)) {
            parents = metadata.parents;
        } else {
            parents = [metadata.parents];
        }
        const p = parents.map((parenthash) => db.none('INSERT INTO parentdatasets(child, parent) VALUES($/thisdset/, (SELECT MAX(id) FROM datasets where hash = $/parenthash/))', { thisdset: dsetid, parenthash }));
        await Promise.all(p);
    }

    // remove old tags
    await Promise.all(tagIdsToDelete.map((id) => db.none('DELETE FROM datasettags WHERE dataset = $/thisdset/ and tag=$/tagid/;', { thisdset: dsetid, tagid: id })));
    // add tags to the dataset if not already
    await Promise.all(newtagids.map((id) => db.none('INSERT INTO datasettags(dataset, tag) VALUES($/thisdset/, $/tagid/) ON CONFLICT DO NOTHING', { thisdset: dsetid, tagid: id })));
};

const getGenerator = async (db, hash) => db.one('SELECT kind, instance, ref FROM datagenerators WHERE id IN (SELECT generator FROM datasets where id = (SELECT max(id) FROM datasets WHERE hash = $1))', hash, (row) => ({ kind: row.kind, instance: row.instance, ref: row.ref }));

const getParents = async (db, hash) => db.map('SELECT hash FROM datasets WHERE id IN (SELECT parent FROM parentdatasets WHERE child = (SELECT MAX(id) FROM datasets WHERE hash = $1))', hash,
    (row) => {
        if (row) {
            return (row.hash);
        }
        return (null);
    });

const getChildren = async (db, hash) => db.map('SELECT hash FROM datasets WHERE id IN (SELECT child FROM parentdatasets WHERE parent = (SELECT max(id) FROM datasets WHERE hash = $1))', hash, (row) => row.hash);

export const get = async (db, hash) => {
    log(`getMetadata of hash ${hash}`);
    const metadata = {
        tags: await getTags(db, hash),
        generator: await getGenerator(db, hash),
        parents: await getParents(db, hash),
        children: await getChildren(db, hash),
    };
    await db.one('SELECT name, projectname, description, data, share FROM datasets WHERE id = (SELECT max(id) FROM datasets WHERE hash = $1)', hash,
        (row) => {
            metadata.name = row.name;
            metadata.projectname = row.projectname;
            metadata.description = row.description;
            metadata.data = row.data;
            metadata.share = row.share;
        });
    return metadata;
};

export const shredMetadata = async (db, hash) => {
    // delete log:
    log('shredMetadata in database...');
    const logdel = db.none('DELETE FROM log WHERE dataset IN (SELECT id FROM datasets WHERE hash = $1)', [hash]);
    // delete all tag associations:
    const tagdel = db.none('DELETE FROM datasettags WHERE dataset IN (SELECT id FROM datasets WHERE hash = $1)', [hash]);
    // delete all parent-child relations:
    const parentdel = db.none('DELETE FROM parentdatasets WHERE child IN (SELECT id FROM datasets WHERE hash = $1) OR parent IN (SELECT id FROM datasets WHERE hash = $1)', [hash]);

    await Promise.all([logdel, tagdel, parentdel]);

    // delete the dataset itself:
    db.none('DELETE FROM datasets WHERE hash = $1;', [hash]);
};
