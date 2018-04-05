require('dotenv').config();

var wpapi = require( 'wpapi' );
var postJSON = {
	title: 'Test event please ignore',
	content: 'test event content',
	location_name: 'oc weekly',
	event_start_date: '2018-10-10'
};

var apiPromise = wpapi.discover( 'http://dev.ocweekly.com' ).then(function( site ) {
    return site.auth({
        username: process.env.WP_USERNAME,
		password: process.env.WP_PASSWORD
    });
});


apiPromise.then(site => {;
	site.event().then(events => console.log(events[0]));
	/*
	site.event().create(postJSON)
	.then(response => console.log(response))
	.catch(err => console.log(err));
	*/
}).catch(console.log);

	


	

