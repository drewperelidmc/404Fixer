require('dotenv').config();

var wpapi = require( 'wpapi' );
var postJSON = {
	title: 'Test post please ignore',
	content: 'this is a test post',
	status: 'draft'
};

var wp = new wpapi({
	endpoint: 'https://www.ocweekly.com/wp-json/',
	username: process.env.WP_USERNAME,
	password: process.env.WP_PASSWORD
});

	

wp.posts().create(postJSON)
.then(response => console.log(response))
.catch(err => console.log(err));

	

