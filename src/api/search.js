import { log } from '../util/index.js';
import { getDb, mayRead, getMetadata } from '../database/index.js';

const queryName = async (db, val) => db.map('SELECT hash FROM datasets WHERE id IN (SELECT id FROM datasets WHERE name LIKE $1 EXCEPT SELECT dataset FROM log WHERE operation = $2)', [val, 'deleted'], (r) => r.hash);
const queryAuthor = async (db, val) => db.map('SELECT hash FROM datasets WHERE id IN (SELECT dataset from log WHERE who LIKE $1 AND operation = $2 EXCEPT SELECT dataset FROM log WHERE operation = $3)', [val, 'created', 'deleted'], (r) => r.hash);
const queryTag = async (db, val) => db.map('SELECT hash FROM datasets WHERE id IN (SELECT dataset FROM datasettags WHERE tag IN (SELECT id FROM tags WHERE name LIKE $1) EXCEPT SELECT dataset FROM log WHERE operation = $2)', [val, 'deleted'], (r) => r.hash);
const queryHash = async (db, val) => db.map('SELECT hash FROM datasets WHERE hash LIKE $1;', [val], (r) => r.hash);
const queryDescription = async (db, val) => db.map('SELECT hash FROM datasets WHERE id IN (SELECT id FROM datasets WHERE description LIKE $1 EXCEPT SELECT dataset FROM log WHERE operation = $2)', [`%${val}%`, 'deleted'], (r) => r.hash);
const queryAny = async (db, val) => {
    // we may also use 'multi' which would be more efficient. but this leads to code doubling...?
    const allresults = await Promise.all([
        queryName(db, val),
        queryHash(db, val),
        queryAuthor(db, val),
        queryTag(db, val),
        queryDescription(db, val),
    ]);
    const uniqueresults = [...new Set(Array.prototype.concat(...allresults))];
    return uniqueresults;
};
const queryAfter = async (db, val) => {
    const date = new Date(val);
    return db.map('SELECT hash FROM datasets WHERE id in (SELECT dataset FROM log WHERE operation = $1 AND time > $2 EXCEPT SELECT dataset FROM log WHERE operation = $3)', ['created', date, 'deleted'], (r) => r.hash);
};
const queryBefore = async (db, val) => {
    const date = new Date(val);
    return db.map('SELECT hash FROM datasets WHERE id in (SELECT dataset FROM log WHERE operation = $1 AND time < $2 EXCEPT SELECT dataset FROM log WHERE operation = $3)', ['created', date, 'deleted'], (r) => r.hash);
};

const query = (db, kind, searchstr) => {
    switch (kind.toLowerCase()) {
    case 'any':
        return queryAny(db, searchstr);
    case 'name':
        return queryName(db, searchstr);
    case 'author':
        return queryAuthor(db, searchstr);
    case 'tag':
        return queryTag(db, searchstr);
    case 'description':
        return queryDescription(db, searchstr);
    case 'after':
        return queryAfter(db, searchstr);
    case 'before':
        return queryBefore(db, searchstr);
    case 'hash':
        return queryHash(db, searchstr);
    default:
        throw (new Error(`unknown search query "${kind}"`));
    }
};

const pairwiseIntersection = (setA, setB) => new Set([...setA].filter((x) => setB.has(x)));
const intersection = (arrOfSets) => {
    if (arrOfSets.length === 1) {
        return arrOfSets[0];
    } if (arrOfSets.length === 0) {
        return new Set();
    }
    const last = arrOfSets.pop();
    const secondToLast = arrOfSets.pop();
    return intersection(arrOfSets.concat(pairwiseIntersection(secondToLast, last)));
};
const processQueries = async (db, queries) => {
    // if there are multiple queries with the same key, we need to replicate the key...
    // this may not be particularly elegant:
    log(queries);
    const allqueries = [];
    Object.keys(queries).forEach((field) => {
        const fieldsqueries = queries[field];
        if (fieldsqueries instanceof Array) {
            fieldsqueries.forEach((q) => { allqueries.push(query(db, field, q)); });
        } else {
            allqueries.push(query(db, field, fieldsqueries));
        }
    });
    const allresults = await Promise.all(allqueries);

    const setOfResults = intersection(allresults.map((arr) => new Set(arr)));

    // turn into array:
    return [...setOfResults];
};
const enrichMetadata = async (db, hash, fields) => {
    // add additional fields fetched from the db
    if (fields.length === 0
        || (fields.length === 1 && fields[0] === 'hash')
    ) {
        return hash;
    }
    // more complex than that
    log('request db');
    const result = {};
    log(fields);
    // potentially can map and abbreviate at this point.
    let mdatafields = fields;
    if (mdatafields.includes('hash')) {
        result.hash = hash;
        mdatafields = mdatafields.filter((f) => (f !== 'hash'));
    }
    const mdata = await getMetadata(db, hash);
    mdatafields.forEach((field) => {
        if (field in mdata) {
            result[field] = mdata[field];
        } else {
            throw (new Error(`unknown metadata field "${field}"`));
        }
    });
    return result;
};
const search = async (ctx) => {
    const db = getDb();
    const resultFields = ('properties' in ctx.request.query)
        ? ctx.request.query.properties.split(',')
        : ['hash'];
    const queries = ctx.request.query;
    // remove properties from queries
    delete queries.properties;

    // get search results
    const result = await processQueries(db, queries);

    // filter out dsets that are not accessible to this user:
    const preadable = result.map((hash) => mayRead(db, ctx.state.authdata, hash));
    const readable = await Promise.all(preadable);

    ctx.body = JSON.stringify(
        await Promise.all(
            result
                .filter((hash, index) => (readable[index])) // remove inaccessibles
                .map((hash) => enrichMetadata(db, hash, resultFields)),
        ),
    );
};
export { search as default };
