require('dotenv').config();
var wpapi = require( 'wpapi' );

var wp = new wpapi({
	endpoint: process.env.url + '/wp-json/',
	username: process.env.WP_USERNAME,
	password: process.env.WP_PASSWORD
});

wp.posts().create({
		title: 'Test post please ignore',
		content: 'test test',
		status: 'draft',
		meta: {ocw_author: 'ocw author test'}
})
.then(data => {
	console.log('it worked');
})
.catch(err => console.log(err.message, err.code));

