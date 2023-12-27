import events from 'node:events'
import net from 'node:net'
import type { Asterisk } from './types'

function generateRandom() {
	return Math.floor(Math.random() * 100_000_000_000_000_000)
}

function generateSocketData<P>(payload: P) {
	const CRLF = '\r\n'
	let str = ''
	for (const i in payload) {
		str += i + ': ' + payload[i] + CRLF
	}
	return str + CRLF
}

const defaultOptions: Required<Asterisk.Options> = {
	port: 5038,
	host: 'localhost',
	username: 'username',
	password: 'password',
	enable_debug: false,
	reconnect: false,
	reconnect_after: 3000,
	events: true,
	identifier: false,
	ami_encoding: 'ascii',
}

export class AsteriskAmi {
	private net = net
	private CRLF = '\r\n'
	private END = '\r\n\r\n'
	private buffer = ''
	private socket: net.Socket | null = null
	private emitter = new events.EventEmitter()
	private options: Required<Asterisk.Options> = defaultOptions

	constructor(options: Asterisk.Options = defaultOptions) {
		this.options = { ...defaultOptions, ...options }
	}

	debug(...logs: any) {
		if (this.options.enable_debug) console.log(...logs)
	}

	private processData(data: string) {
		/*
		Thanks to mscdex for this bit of code that takes many lots of data and sorts them out into one if needed!
		https://github.com/mscdex/node-asterisk/blob/master/asterisk.js
		*/
		if (data.substring(0, 21) === 'Asterisk Call Manager') {
			data = data.substring(data.indexOf(this.CRLF) + 2) // skip the server greeting when first connecting
		}
		this.buffer += data
		let iDelim,
			info,
			kv,
			type,
			all_events = []
		while ((iDelim = this.buffer.indexOf(this.END)) > -1) {
			info = this.buffer.substring(0, iDelim + 2).split(this.CRLF)
			this.buffer = this.buffer.substring(iDelim + 4)
			const result: any = {}
			type = ''
			kv = []
			for (var i = 0, len = info.length; i < len; i++) {
				if (info[i].indexOf(': ') == -1) {
					continue
				}
				kv = info[i].split(': ', 2)
				kv[0] = kv[0].toLowerCase().replace('-', '')
				if (i == 0) {
					type = kv[0]
				}
				result[kv[0]] = kv[1]
			}
			if (this.options.identifier) {
				result.identifier = this.options.identifier
			}
			all_events.push(result)
		}
		return all_events
	}

	private emit(event: Asterisk.Event, ...payload: any[]) {
		this.emitter.emit(event, ...payload)
	}

	on(event: Asterisk.Event, event_cb: (...payload: any[]) => void) {
		this.emitter.on(event, event_cb)
	}

	send<P>(payload: P, send_cb?: (error?: Error) => void) {
		// check state of connection, if not up then bail out
		if (!(payload as any).ActionID) {
			;(payload as any).ActionID = generateRandom()
		}

		if (this.socket !== null && this.socket.writable) {
			this.debug(payload)
			this.socket.write(
				generateSocketData(payload),
				this.options.ami_encoding,
				send_cb,
			)
		} else {
			this.debug('send(): cannot write to Asterisk Socket.')
			this.emit('ami_socket_unwritable')
		}
	}

	disconnect() {
		this.options.reconnect = false // just in case we wanted it to reconnect before, we've asked for it to be closed this time so make sure it doesn't reconnect
		if (this.socket) this.socket.end(generateSocketData({ Action: 'Logoff' }))
	}

	destroy() {
		this.socket?.destroy()
	}

	connect(connect_cb: () => void, data_cb: (data: Buffer) => void) {
		this.debug('connect(): running asterisk connect fn.')
		this.socket = null
		this.socket = this.net.createConnection(
			this.options.port!,
			this.options.host,
		)
		this.socket.setEncoding(this.options.ami_encoding)
		this.socket.setKeepAlive(true, 500)

		this.socket
			.on('connect', () => {
				this.debug('connect():on_connect: connected to Asterisk AMI.')
				// login to manager interface
				this.send({
					Action: 'login',
					Username: this.options.username,
					Secret: this.options.password,
					Events: this.options.events ? 'on' : 'off',
				})
				if (connect_cb && typeof connect_cb === 'function') connect_cb()
			})
			.on('data', (data) => {
				if (data_cb && typeof data_cb === 'function') data_cb(data)
				const all_events = this.processData(data.toString())
				for (const i in all_events) {
					const result = all_events[i]
					if (
						result.response &&
						result.message &&
						/Authentication/gi.test(result.message)
					) {
						this.emit(
							'ami_login',
							result.response === 'Success' ? true : false,
							result,
						)
					}
					this.emit('ami_data', result)
				}
			})
			.on('drain', () => {
				this.debug('connect():on_drain: Asterisk Socket connection drained')
				this.emit('ami_socket_drain')
			})
			.on('error', (error) => {
				if (error)
					this.debug(
						`connect():on_error: Asterisk Socket connection error, error was: ${error}`,
					)
				this.emit('ami_socket_error', error)
			})
			.on('timeout', () => {
				this.debug(
					'connect():on_timeout: Asterisk Socket connection has timed out',
				)
				this.emit('ami_socket_timeout')
			})
			.on('end', () => {
				this.debug('connect():on_end: Asterisk Socket connection ran end event')
				this.emit('ami_socket_end')
			})
			.on('close', (had_error) => {
				this.debug(
					`connect():on_close: Asterisk Socket connection closed, error status - ${had_error}`,
				)
				this.emit('ami_socket_close', had_error)
				if (this.options.reconnect) {
					this.debug(
						`connect():on_close:reconnect: Reconnecting to AMI in ${this.options.reconnect_after}`,
					)
					setTimeout(
						() => this.connect(connect_cb, data_cb),
						this.options.reconnect_after,
					)
				}
			})
	}
}
