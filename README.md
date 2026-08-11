# Caching Proxy Server

A command-line interface (CLI) tool that forwards requests to an origin server, caches the responses, and returns cached data on repeated requests to reduce response times and origin server load.

This project is a solution to the [Caching Proxy Server Project on roadmap.sh](https://roadmap.sh/projects/caching-server).

---

## Features

- **CLI-driven Interface:** Easily start the proxy server with custom port and origin configurations.
- **Response Caching:** Stores responses from the origin server to serve future identical requests faster.
- **Cache Headers:** Adds headers (e.g., `X-Cache: HIT` and `X-Cache: MISS`) to indicate whether the response was served from cache.
- **Cache Clearing:** Provides a simple CLI command to clear stored cache data.

---

## Prerequisites

- Node.js (v18 or higher) <!-- Replace with your language/runtime if different -->

---

## Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/caching-proxy.git](https://github.com/your-username/caching-proxy.git)
---

## How to use 

1. Run first npm i in order to install all the required packages .
2. Possible commends :
   -caching-proxy --clear-cache to clear redis caching server.
   -caching-proxy --port <port> --origin <url of the target webpage> .
3. You can use -o and -p as a short cut of --origin and --port
