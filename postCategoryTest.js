require('dotenv').config();
const convert = require('xml-to-json-promise');
const readdir = require('fs-readdir-promise');
const wpapi = require( 'wpapi' );
const wp = new wpapi({
	endpoint: process.env.url + '/wp-json/',
	username: process.env.WP_USERNAME,
	password: process.env.WP_PASSWORD
});

wp.categories().create({name: 'test test'})
.then(console.log)
.catch(console.log);