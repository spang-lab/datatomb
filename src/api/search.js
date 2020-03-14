import { datasetFileExists } from '../util/index.js';
import { getDb, mayRead } from '../database/index.js';

const queryName = async (db, val) => db.map('SELECT hash FROM datasets WHERE name LIKE $1', val, (r) => r.hash);
const queryAuthor = async (db, val) => db.map('SELECT hash FROM datasets WHERE id IN (SELECT dataset from log WHERE who LIKE $1 AND operation = $2)', [val, 'created'], (r) => r.hash);
const queryTag = async (db, val) => db.map('SELECT hash FROM datasets WHERE id IN (SELECT dataset FROM datasettags WHERE tag IN (SELECT id FROM tags WHERE name LIKE $1))', val, (r) => r.hash);
const queryDescription = async (db, val) => db.map('SELECT hash FROM datasets WHERE description LIKE $1', `%${val}%`, (r) => r.hash);
const queryAny = async (db, val) => {
    // we may also use 'multi' which would be more efficient. but this leads to code doubling...?
    const allresults = await Promise.all([
        queryName(db, val),
        queryAuthor(db, val),
        queryTag(db, val),
        queryDescription(db, val),
    ]);
    const uniqueresults = [...new Set(Array.prototype.concat(...allresults))];
    return uniqueresults;
};
const queryAfter = async (db, val) => {
    const date = new Date(val);
    return db.map('SELECT hash FROM datasets WHERE id in (SELECT dataset FROM log WHERE operation = $1 AND time > $2)', ['created', date], (r) => r.hash);
};
const queryBefore = async (db, val) => {
    const date = new Date(val);
    return db.map('SELECT hash FROM datasets WHERE id in (SELECT dataset FROM log WHERE operation = $1 AND time < $2)', ['created', date], (r) => r.hash);
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
    default:
        throw (new Error(`unknown search query "${searchstr}"`));
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
    const allqueries = Object.keys(queries).map((key) => query(db, key, queries[key]));
    const allresults = await Promise.all(allqueries);

    const setOfResults = intersection(allresults.map((arr) => new Set(arr)));

    // turn into array:
    return [...setOfResults];
};
const search = async (ctx) => {
    const db = getDb();
    const result = await processQueries(db, ctx.request.query);

    // remove deleted datasets.
    // could add this restriction to the queries, but that complicates the queries a bit.
    // so going with this for the moment.
    const pfileexists = result.map((hash) => datasetFileExists(ctx, hash));
    // filter out dsets that are not meant for this user:
    const preadable = result.map((hash) => mayRead(db, ctx.state.authdata, hash));
    const fileexists = await Promise.all(pfileexists);
    const readable = await Promise.all(preadable);

    ctx.body = JSON.stringify(
        result
            .filter((hash, index) => (fileexists[index] && readable[index])),
    );
};
export { search as default };
