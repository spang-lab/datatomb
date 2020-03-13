import { log } from '../util/index.js';
import { getDb, mayRead } from '../database/index.js';
import pgPromise from 'pg-promise';
const pgp = pgPromise({capSQL: true});

const queryName = async function(db, val) {
    // would lik e to: const v = pgp.as.text(val);
    return db.map('SELECT hash FROM datasets WHERE name LIKE $1', val, r => r.hash);
}
const queryAuthor = async function(db, val) {
    return db.map('SELECT hash FROM datasets WHERE id IN (SELECT dataset from log WHERE who LIKE $1 AND operation = $2)', [val, 'created'], r => r.hash);
}
const queryTag = async function(db, val) {
    log('query tag');
    return db.map('SELECT hash FROM datasets WHERE id IN (SELECT dataset FROM datasettags WHERE tag IN (SELECT id FROM tags WHERE name LIKE $1))', val, r => r.hash);
}
const queryDescription = async function(db, val) {
    log('query descr');
    return db.map('SELECT hash FROM datasets WHERE description LIKE $1', '%'+val+'%', r => r.hash);
}

const queryAny = async function(db, val) {
    // we may also use 'multi' which would be more efficient. but this leads to code doubling...?
    const allresults = await Promise.all([ queryName(db, val), queryAuthor(db, val), queryTag(db, val), queryDescription(db, val) ]);
    const uniqueresults = [...new Set(Array.prototype.concat(...allresults))];
    return uniqueresults;
}

const query = function(db, kind, searchstr) {
    log(`query: kind=${kind}`);
    switch(kind.toLowerCase()) {
    case 'any':
        return queryAny(db, searchstr);
        break;
    case 'name':
        return queryName(db, searchstr);
        break;
    case 'author':
        return queryAuthor(db, searchstr);
        break;
    case 'tag':
        return queryTag(db, searchstr);
        break;
    case 'description':
        return queryDescription(db, searchstr);
        break;
    default:
        throw(new Error(`unknown search query "${key}"`));
    };
};

const pairwiseIntersection = function(setA, setB) {
    return new Set([...setA].filter(x => setB.has(x)));
}
const intersection = function(arrOfSets) {
    if( arrOfSets.length === 1 ) {
        return arrOfSets[0];
    } else if( arrOfSets.length === 0 ) {
        return new Set();
    }
    const last = arrOfSets.pop();
    const secondToLast = arrOfSets.pop();
    return intersection(arrOfSets.concat(pairwiseIntersection(secondToLast, last)));
}
const processQueries = async (db, queries) => {
    const allqueries = Object.keys(queries).map((key) => {
        return query(db, key, queries[key]);
    });
    const allresults = await Promise.all(allqueries);

    const setOfResults = intersection(allresults.map(arr => new Set(arr)));

    // turn into array:
    return [...setOfResults];
};
export const search = async (ctx) => {
    const db = getDb();
    // const result = await queryTag(db, ctx.request.query['tag']);
    const result = await processQueries(db, ctx.request.query);
    // filter out dsets that are not meant for this user:
    ctx.body = JSON.stringify(result.filter(hash => mayRead(db, ctx.state.authdata, hash)));
};
