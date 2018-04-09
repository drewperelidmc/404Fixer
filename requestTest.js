require('dotenv').config();
var rp = require('request-promise');

var options = {
	method: 'GET',
	uri: process.env.url + 'wp-json/wp/v2/event',
	auth: {
		username: process.env.wp_username,
		password: process.env.wp_password
	},
	body: {
		page: 10,
		title: 'Test post please ignore',
		content: 'test test',
		status: 'draft',
		meta: {ocw_author: 'ocw author test'}
	},
	json: true
}

rp(options)
.then(data => {
	console.log(data[0]);
})
.catch(err => console.log(err.message, err.code));