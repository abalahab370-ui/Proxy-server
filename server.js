const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "config/.env") });
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const CreateClient = require("redis").CreateClient;
const PORT = process.env.PORT || 5500;

//a simple json middleware : 
app.use(express.json()) ;

//So basiclly this is a proxy server that will cache the data from the database and return it to the client. if the data is not in the cache, it will fetch it from the database and store it in the cache for future requests.
//So lets start by setting up the redis client connection 
const client = require("./data/rdConnection.js")

//Second of all we have to manage the caching system by reciving and redirecting requests :

app.use( async (req, res) => {
      try {
  const cacheKey = `proxy:${req.originalUrl}`;

  // 1 NON GET REQUESTS (POST, PUT, DELETE): Bypass cache completely
  if (req.method !== 'GET') {
    const originResponse = await fetch(`${ORIGIN}${req.originalUrl}`, {
      method: req.method,
      headers: { 'Content-Trype': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
      //cuz for delete we useally dont have a body data.
    });

    const data = await originResponse.json();
    res.setHeader('X-Cache', 'BYPASS');
    return res.status(originResponse.status).json(data);
  }

  // 2 GET REQUESTS: Check Redis Cache First
  const cachedData = await client.get(cacheKey);
  if (cachedData) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(JSON.parse(cachedData));
  }

  // 3 GET MISS: Fetch from Origin and Save to Redis
  const originResponse = await fetch(`${ORIGIN}${req.originalUrl}`);
  const data = await originResponse.json();

  await client.set(cacheKey, JSON.stringify(data));
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
} catch (err) {
      console.error (`Sir We have a probelm : ${err}`)
}
});


app.listen ( PORT , () => {
      console.log (`Server is up Running in Port :${PORT}`) ;
})