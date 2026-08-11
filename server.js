#!/usr/bin/env node

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "config/.env") });

const express = require("express");
const { parseArgs } = require("node:util");
const client = require("./data/rdConnection.js");

const app = express();

const main = async () => {
  try {
    // 1. Parse CLI options
    const { values } = parseArgs({
      options: {
        port: { type: "string", short: "p", default: "5500" },
        origin: { type: "string", short: "o" },
        "clear-cache": { type: "boolean", short: "c" }
      }
    });

    // 2. Handle --clear-cache flag
    if (values["clear-cache"]) {
      console.log("Clearing Redis cache...");
      await client.flushAll();
      console.log("Cache cleared successfully!");
      await client.disconnect();
      process.exit(0);
    }

    // 3. Validate and normalize --origin URL
    let ORIGIN = values.origin || process.env.ORIGIN;
    if (!ORIGIN) {
      console.error("Error: --origin <url> is required.");
      console.error("Example: caching-proxy --port 3000 --origin http://dummyjson.com");
      if (client.isOpen) await client.disconnect();
      process.exit(1);
    }

    ORIGIN = ORIGIN.replace(/^\/+/, "");
    if (!/^https?:\/\//i.test(ORIGIN)) ORIGIN = `http://${ORIGIN}`;
    ORIGIN = ORIGIN.replace(/\/+$/, "");

    const PORT = parseInt(values.port, 10) || 5500;

    // 4. Middleware
    app.use(express.json());

    // 5. Caching Proxy Core Handler
    app.use(async (req, res) => {
      try {
        const cacheKey = `proxy:${req.originalUrl}`;
        const targetUrl = `${ORIGIN}${req.originalUrl}`;
        console.log(`${req.method} ${req.path}`);

        // Non-GET requests (POST, PUT, DELETE): Bypass cache completely
        if (req.method !== "GET") {
          const originResponse = await fetch(targetUrl, {
            method: req.method,
            headers: { "Content-Type": "application/json" },
            body: ["POST", "PUT", "PATCH"].includes(req.method)
              ? JSON.stringify(req.body)
              : undefined
          });

          const contentType = originResponse.headers.get("content-type") || "text/plain";
          const buffer = Buffer.from(await originResponse.arrayBuffer());

          if (contentType) res.setHeader("Content-Type", contentType);
          res.setHeader("X-Cache", "BYPASS");
          return res.status(originResponse.status).send(buffer);
        }

        // GET REQUEST: Check Redis Cache (HIT)
        const cachedEnvelope = await client.get(cacheKey);
        if (cachedEnvelope) {
          const envelope = JSON.parse(cachedEnvelope);

          if (envelope.contentType) {
            res.setHeader("Content-Type", envelope.contentType);
          }
          res.setHeader("X-Cache", "HIT");
          
          // Decode Base64 string back to binary buffer for Express to serve
          const binaryBuffer = Buffer.from(envelope.body, "base64");
          return res.status(envelope.status).send(binaryBuffer);
        }

        // GET MISS: Fetch from origin
        const originResponse = await fetch(targetUrl);
        const contentType = originResponse.headers.get("content-type") || "text/plain";
        const status = originResponse.status;

        // Convert origin binary stream to Buffer
        const buffer = Buffer.from(await originResponse.arrayBuffer());

        // Construct envelope with Base64 payload
        const envelope = {
          status,
          contentType,
          body: buffer.toString("base64")
        };

        // Cache envelope in Redis (300s TTL)
        await client.set(cacheKey, JSON.stringify(envelope), { EX: 300 });

        if (contentType) res.setHeader("Content-Type", contentType);
        res.setHeader("X-Cache", "MISS");
        return res.status(status).send(buffer);

      } catch (err) {
        console.error(`Proxy Request Error: ${err.message}`);
        return res.status(500).json({ error: "Proxy forwarding failed", details: err.message });
      }
    });

    // 6. Start listening
    app.listen(PORT, () => {
      console.log(`Caching Proxy running on port ${PORT} -> Target: ${ORIGIN}`);
    });

  } catch (err) {
    console.error(`Initialization Error: ${err.message}`);
    process.exit(1);
  }
};

main();