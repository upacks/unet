### Hello 👋
uNet is a class that is an abstraction of a Node HTTP / TCP Socket
### Classes 
```javascript
# Redis: Handles Redis connection between Hosts and NetHosts.
# Host & Connection: HTTP Host and Client also provides a WebSocket connection.
# ReplicaMaster & ReplicaSlave: Data replication using Sequelize over Host and NetHost.
# NetHost & NetConnection: TCP Host and Client connection.
```
### Simple HTTP connection example
```javascript
import { Safe, Shell, Delay, Loop, log } from 'utils'
import { Host, Connection } from 'unet'

Safe(() => {

    /** Server side **/
    const API = new Host({ name: 'NMEA', port: 4000, redis: false })
    API.on('command', ({ query }) => ({ out: Shell.exec(query.command, { silent: true }).stdout }))
    Loop(() => API.emit('sms', `Server: ${Date.now()}`), 2500)

    /** Client side **/
    const APP = new Connection({ name: 'NMEA', proxy: "http://127.0.0.1:4000", token: ':)' })
    APP.on('sms', (e) => log.success(e))
    Loop(() => APP.pull('command', { command: `yarn list typescript | grep "└─"` }, (err, data) => log.warn(data.out)), 2500)

})
```