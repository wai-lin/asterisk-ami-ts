# ASTERISK-AMI-TS

Typescript conversion of [asterisk-ami](https://github.com/holidayextras/node-asterisk-ami) library.

> **Credit:**
> I'm grateful to the original library [asterisk-ami](https://github.com/holidayextras/node-asterisk-ami).
> This library is just near one to one mapping conversion to Typescript of `asterisk-ami`.

### ESM

```ts
import { AsteriskAmi } from 'asterisk-ami-ts'
import type { Asterisk } from 'asterisk-ami-ts'

const options: Asterisk.Options = {
	host: 'hostname',
	username: 'username',
	password: 'secret',
}

const ami = new AsteriskAmi(options)
ami.on('ami_data', (data) => console.log('AMI DATA', data))
ami.connect(() => ami.send({ action: 'Ping' }))
ami.send({ action: 'Ping' })
```

### CJS

```js
const { AsteriskAmi } = require('asterisk-ami-ts')

/** @type {import('asterisk-ami-ts').Asterisk.Options} */
const options = {
	host: 'hostname',
	username: 'username',
	password: 'secret',
}

const ami = new AsteriskAmi(options)
ami.on('ami_data', (data) => console.log('AMI DATA', data))
ami.connect(() => ami.send({ action: 'Ping' }))
ami.send({ action: 'Ping' })
```

---

### Events

> NOTE: AMI events are typed.

(AMI Data) These give you AMI specific information

- `ami_login` Called when logging into the ami, no data passed back
- `ami_data` Called for each event we get back from the AMI, with an object being returned

(net socket events) Use these events to determine the status of the socket connection, as if the socket is disconnected, you would need to add your .on('close') events again, this was a bug in the previous version of asterisk-ami, use these new events instead which will always be called, even if the connection has died and been reconnected.

- `ami_socket_drain`
- `ami_socket_error`
- `ami_socket_timeout`
- `ami_socket_end`
- `ami_socket_close`
- `ami_socket_unwritable`

```ts
export namespace Asterisk {
	export type Event =
		| 'ami_login'
		| 'ami_data'
		| 'ami_socket_drain'
		| 'ami_socket_error'
		| 'ami_socket_timeout'
		| 'ami_socket_end'
		| 'ami_socket_close'
		| 'ami_socket_unwritable'
}
```

---

### Methods

```ts
export declare class AsteriskAmi {
	constructor(options?: Asterisk.Options)
	debug(...logs: any): void
	on(event: Asterisk.Event, event_cb: (...payload: any[]) => void): void
	send<P>(payload: P, send_cb?: (error?: Error) => void): void
	disconnect(): void
	destroy(): void
	connect(connect_cb: () => void, data_cb: (data: Buffer) => void): void
}
```

---

### Options

```ts
export namespace Asterisk {
	export interface Options {
		port?: number // Port number for Asterisk AMI, default: `5038`
		host: string // Host of Asterisk, default: `localhost`
		username: string // Username of Asterisk AMI user, default: `username`
		password: string // Password of Asterisk AMI user, default: `password`
		enable_debug?: boolean // Do you want debugging output to the screen, default: `false`
		reconnect?: boolean // Do you want the ami to reconnect if the connection is dropped, default: `false`
		reconnect_after?: number // How long to wait to reconnect, in milliseconds, default: `3000`
		events?: Asterisk.Event | boolean // Do we want to receive AMI events, default: `true`
		ami_encoding?: BufferEncoding // Socket encoding method, default: `ascii`
	}
}
```
