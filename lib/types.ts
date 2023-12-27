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
		| (string & {})

	export interface Options {
		username: string
		password: string
		host: string
		port?: number
		enable_debug?: boolean
		reconnect?: boolean
		reconnect_after?: number
		events?: Asterisk.Event | boolean
		identifier?: boolean
		ami_encoding?: BufferEncoding
	}
}
