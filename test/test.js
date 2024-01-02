const { AsteriskAmi } = require('../dist/index')
const fs = require('node:fs')
const config = require('./config')

const ami = new AsteriskAmi(config)
const LF = '\n=================================\n'

ami.on('ami_data', (data) => {
	const logStream = fs.createWriteStream('./ami_logs', { flags: 'a' })
	const logData = new Date() + '\n' + JSON.stringify(data, null, 2) + LF
	logStream.write(logData, () => console.log('Stream : ' + new Date()))
})

ami.on('ami_socket_error', (error) => {
	console.log(error)
	process.exit(1)
})
ami.on('ami_socket_close', () => process.exit(1))

ami.connect(() => ami.send({ action: 'Ping' }))
