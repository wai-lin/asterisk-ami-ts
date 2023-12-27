const { AsteriskAmi } = require('../dist/index')
const fs = require('node:fs')
const config = require('./config')

const ami = new AsteriskAmi(config)

ami.on('ami_data', (data) => {
	const logStream = fs.createWriteStream('./ami_logs', { flags: 'a' })

	const logData =
		JSON.stringify(data, null, 2) + '\n=================================\n'

	logStream.write(logData, () => console.log('Stream'))
})

ami.on('ami_socket_error', (error) => {
	console.log(error)
	process.exit(1)
})
ami.on('ami_socket_close', () => process.exit(1))

ami.connect(() => ami.send({ action: 'Ping' }))
