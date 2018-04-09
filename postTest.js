require('dotenv').config();

var wpapi = require( 'wpapi' );
var postJSON = {
	title: 'Test event please ignore',
	content: 'test event content',
	meta: {
		location_name: 'oc weekly',
		event_start_date: '2018-10-10'
	}
};

var auth = {
        username: process.env.WP_USERNAME,
		password: process.env.WP_PASSWORD
    }

const wp = new wpapi({
	endpoint: process.env.url + '/wp-json/',
	username: process.env.WP_USERNAME,
	password: process.env.WP_PASSWORD
});

var namespace = 'wp/v2'; // use the WP API namespace
var route = '/event/(?P<id>)'; // route string - allows optional ID parameter

wp.events = wp.registerRoute(namespace, route);

wp.events().create(postJSON).then(console.log).catch(console.log);

/*

var apiPromise = wpapi.discover( 'http://dev.ocweekly.com' ).then(function( site ) {
    return site.auth(auth);
});


apiPromise.then(site => {
	console.log(site);
	//site.event().then(events => console.log(events[0]));

	//site.event().create(postJSON).then(response => console.log(response)).catch(err => console.log(err));

}).catch(console.log);

	

*/
	

