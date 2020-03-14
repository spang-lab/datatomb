import { getDb } from './index.js';
import { log } from '../util/index.js';

export const exists = async function(db, hash) {
    const result = await db.one('SELECT count(*) FROM datasets where hash = $/hash/', {hash: hash});
    return (result.count > 0); // there may be more than 1 dataset with that hash (historical data)
}

export const getCreator = async function(db, hash) {
    if( ! await exists(db, hash) ){
        throw(new Error(`no dataset for hash ${hash}`));
    }
    return db.one('SELECT who FROM log WHERE dataset = (SELECT MAX(id) FROM datasets WHERE hash = $1) AND operation = $2', [hash, 'created'], u => u.who );
}

export const mayRead = async function(db, authdata, hash) {
    if( authdata.isAdmin ) {
        log(`admin access for ${authdata.user}`);
        return true;
    } else {
        const share = await getShareState(db, hash);
        log(`access to ${hash} is ${share}.`);

        if( share === 'public' ) {
            return true;
        } else if( share === 'internal' ) {
            if( authdata.isUser ) {
                return true;
            } else {
                throw(new Error('user is not a datatomb user.'));
            }
        } else if( share === 'private' ) {
            const owner = await getCreator(db, hash);
            if( owner === authdata.user ) {
                return true;
            } else {
                return false;
            }
        } else {
            throw(new Error(`unknown sharestate.`));
        }
    }
    return false;
}

export const getShareState = async function(db, hash) {
    if( ! await exists(db, hash) ){
        throw(new Error(`no dataset for hash ${hash}`));
    }
    return db.one('SELECT share FROM datasets WHERE id = (SELECT MAX(id) FROM datasets WHERE hash = $1)', hash, s => s.share);
}

const getInsertTagId = function(db, tag) {
    return db.task('getInsertTagId', t => {
        return t.oneOrNone('SELECT id FROM tags WHERE name = $1', tag, t => t && t.id)
            .then( tagId => {
                return tagId || t.one('INSERT INTO tags(name) VALUES($1) RETURNING id', tag, t => t.id);
            });
    });
}
const getInsertDataGeneratorId = function(db, datagen) {
    return db.task('getInsertDataGeneratorId', t => {
        if( datagen.ref ) {
            return t.oneOrNone('SELECT id FROM datagenerators WHERE kind = $1 AND instance = $2 AND ref = $3', [datagen.kind, datagen.instance, datagen.ref], t => t && t.id)
                .then( id => {
                    return id || t.one('INSERT INTO datagenerators(kind, instance, ref) VALUES($1, $2, $3) RETURNING id', [datagen.kind, datagen.instance, datagen.ref], t => t.id);
                });
        } else {
            return t.oneOrNone('SELECT id FROM datagenerators WHERE kind = $1 AND instance = $2 AND ref IS NULL', [datagen.kind, datagen.instance], t => t && t.id)
                .then( id => {
                    return id || t.one('INSERT INTO datagenerators(kind, instance) VALUES($1, $2) RETURNING id', [datagen.kind, datagen.instance], t => t.id);
                });
        }
    });
}

const getInsertDatasetId = function(db, hash, metadata, dgenid) {
    return db.one('INSERT INTO datasets(hash, name, projectname, description, data, generator, share) VALUES($/hash/, $/name/, $/projectname/, $/description/, $/data/, $/dgenid/, $/share/) RETURNING id;',
                     {
                         hash: hash,
                         name: metadata.name,
                         projectname: metadata.projectname,
                         description: metadata.description,
                         data: metadata.data,
                         dgenid: dgenid,
                         share: metadata.share
                     }, t => t.id);
}

export const add = async function(db, hash, metadata) {
    log(`add dataset ${hash} to db.`);

    // generate tags:
    const tagids = await Promise.all(metadata.tags.map((tag) => getInsertTagId(db, tag)));
    // genetare datagenerator:
    const datagenid = await getInsertDataGeneratorId(db, metadata.generator);
    // generate data set itself:
    const dsetid = await getInsertDatasetId(db, hash, metadata, datagenid);
    // if there is a parent, generate the relation to it:
    if( metadata.parents ) {
        var parents = null;
        if( Array.isArray(metadata.parents) ) {
            parents = metadata.parents;
        } else {
            parents = [ metadata.parents ];
        }
        const p = parents.map((parenthash) => db.none('INSERT INTO parentdatasets(child, parent) VALUES($/thisdset/, (SELECT MAX(id) FROM datasets where hash = $/parenthash/))', {thisdset: dsetid, parenthash: parenthash}));
        await Promise.all(p);
    }

    // add tags to the dataset:
    await Promise.all(tagids.map(id => db.none('INSERT INTO datasettags(dataset, tag) VALUES($/thisdset/, $/tagid/) ON CONFLICT DO NOTHING', {thisdset: dsetid, tagid: id})));
}

const getTags = async function(db, hash) {
    return db.map('SELECT name FROM tags WHERE id IN (SELECT tag FROM datasettags WHERE dataset = (SELECT max(id) FROM datasets WHERE hash = $1))', hash, row => row.name);
}
const getGenerator = async function(db, hash) {
    return db.one('SELECT kind, instance, ref FROM datagenerators WHERE id IN (SELECT generator FROM datasets where id = (SELECT max(id) FROM datasets WHERE hash = $1))', hash, row => { return {kind: row.kind, instance: row.instance, ref: row.ref}; });
}
const getParents = async function(db, hash) {
    return db.map('SELECT hash FROM datasets WHERE id IN (SELECT parent FROM parentdatasets WHERE child = (SELECT MAX(id) FROM datasets WHERE hash = $1))', hash,
                        row => {
                            if( row ) {
                                return(row.hash);
                            } else {
                                return(null);
                            }
                        });
}
const getChildren = async function(db, hash) {
    return db.map('SELECT hash FROM datasets WHERE id IN (SELECT child FROM parentdatasets WHERE parent = (SELECT max(id) FROM datasets WHERE hash = $1))', hash, row => row.hash);
}
export const get = async function(db, hash) {
    log(`getMetadata of hash ${hash}`);
    let metadata = {
        tags: await getTags(db, hash),
        generator: await getGenerator(db, hash),
        parents: await getParents(db, hash),
        children: await getChildren(db, hash)
    };
    await db.one('SELECT name, projectname, description, data, share FROM datasets WHERE id = (SELECT max(id) FROM datasets WHERE hash = $1)', hash,
                 row => {
                     metadata.name = row.name;
                     metadata.projectname = row.projectname;
                     metadata.description = row.description;
                     metadata.data = row.data;
                     metadata.share = row.share;
                 });
    return metadata;
}
