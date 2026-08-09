const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../config/.env") });
const redis = require("redis") ;
const createClient = redis.createClient ;

const client = createClient( {
      password : process.env.REDIS_PASSWORD,
      socket : {
          host : process.env.REDIS_HOST,
          port : Number(process.env.REDIS_PORT)
      }
}) ;

// Always register error handler first
client.on('error', (err) => console.error('Redis Client Error:', err));


// Connect asynchronously on start
async function initRedis() {
  if (!client.isOpen) {
    await client.connect();
    console.log('Redis Client Connected!');
  }
}

initRedis();

module.exports = client ;