import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

// Las páginas de la tienda y las consultas cacheadas se guardan en KV:
// así casi ninguna visita consume CPU del Worker ni abre conexión a Mongo.
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
