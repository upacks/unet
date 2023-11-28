"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicaSlave = exports.ReplicaMaster = exports.NetClient = exports.NetServer = exports.Proxy = exports.Core = exports.Connection = exports.Host = exports.Redis = void 0;
var redis_1 = require("./redis");
Object.defineProperty(exports, "Redis", { enumerable: true, get: function () { return redis_1.Redis; } });
var host_1 = require("./host");
Object.defineProperty(exports, "Host", { enumerable: true, get: function () { return host_1.Host; } });
var connection_1 = require("./connection");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return connection_1.Connection; } });
var proxy_1 = require("./proxy");
Object.defineProperty(exports, "Core", { enumerable: true, get: function () { return proxy_1.Core; } });
Object.defineProperty(exports, "Proxy", { enumerable: true, get: function () { return proxy_1.Proxy; } });
var tcp_1 = require("./tcp");
Object.defineProperty(exports, "NetServer", { enumerable: true, get: function () { return tcp_1.NetServer; } });
Object.defineProperty(exports, "NetClient", { enumerable: true, get: function () { return tcp_1.NetClient; } });
var master_1 = require("./replication/master");
Object.defineProperty(exports, "ReplicaMaster", { enumerable: true, get: function () { return master_1.ReplicaMaster; } });
var slave_1 = require("./replication/slave");
Object.defineProperty(exports, "ReplicaSlave", { enumerable: true, get: function () { return slave_1.ReplicaSlave; } });
require.main === module && require('./sample');
//# sourceMappingURL=index.js.map