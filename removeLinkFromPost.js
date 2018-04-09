require('dotenv').config();
const { URL } = require('url');
const cheerio = require('cheerio');
const compareUrls = require('compare-urls');
const wpapi = require( 'wpapi' );
const wp = new wpapi({
	endpoint: process.env.url + '/wp-json/',
	username: process.env.WP_USERNAME,
	password: process.env.WP_PASSWORD
});

function removeLinkFromPost(urlString, link){
	return new Promise((res, rej) => {
		//First get slug from link
		var url = new URL(urlString);
		var slug = url.pathname.split('/').pop();
		wp.posts().slug(slug)
		.then(data => {
			var post = data.find(d =>compareUrls(d.link, urlString));
			if (!post)return rej('Could not find post with slug: ' + slug + ' and url ' + urlString);
			const $ = cheerio(post.content.rendered);
			$(`a[href="${link}"`).contents().unwrap();
			console.log($().contents());
		})
		.catch(console.log);
	})
}

removeLinkFromPost('https://www.ocweekly.com/letters-6370142', null).catch(console.log);

