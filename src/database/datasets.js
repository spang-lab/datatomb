import { getDb } from './index.js';
import { log } from '../util/index.js';

export const exists = async function(db, hash) {
    const result = await db.one('SELECT count(*) FROM datasets where hash = $/hash/', {hash: hash});
    return (result.count > 0); // there may be more than 1 dataset with that hash (historical data)
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
    return db.one('INSERT INTO datasets(hash, name, projectname, description, data, generator) VALUES($/hash/, $/name/, $/projectname/, $/description/, $/data/, $/dgenid/) RETURNING id;',
                     {
                         hash: hash,
                         name: metadata.name,
                         projectname: metadata.projectname,
                         description: metadata.description,
                         data: metadata.data,
                         dgenid: dgenid
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
    if( metadata.parent ) {
        await db.none('INSERT INTO parentdatasets(child, parent) VALUES($/thisdset/, (SELECT id FROM datasets where hash = $/parenthash/))', {thisdset: dsetid, parenthash: metadata.parent});
    }

    // add tags to the dataset:
    await Promise.all(tagids.map(id => db.none('INSERT INTO datasettags(dataset, tag) VALUES($/thisdset/, $/tagid/) ON CONFLICT DO NOTHING', {thisdset: dsetid, tagid: id})));
}
