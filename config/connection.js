// const mongoClient = require('mongodb').MongoClient

// const state ={
//     db : null
// }

// module.exports.connect = (done)=>{
//     const url = "mongodb://127.0.0.1:27017" 
//     const dbname = "shopping"

//     mongoClient.connect (url,(err,data)=>{
//         if (err) return done (err)
//         else state.db = data.db(dbname)
//         done()  
//     })
    
// }
// module.exports.get=()=>{
//     return state.db
// }
const { MongoClient } = require("mongodb");

const state = {
  db: null,
};

const url = "mongodb://127.0.0.1:27017";

const dbName = "shopping";

const client = new MongoClient(url);

const connect = async (cb) => {
    
  try {
    await client.connect();

    const db = client.db(dbName);

    state.db = db;

    return cb();
  } catch (err) {

    return cb(err);
  }
};
const get = () => state.db;

module.exports = {
  connect,
  get,
};