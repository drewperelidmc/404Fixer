
var items;
require('dotenv').config();
const { URL } = require('url');
const opn = require('opn');
const convert = require('xml-to-json-promise');
const titleCase = require('title-case');
const wpapi = require( 'wpapi' );
const wp = new wpapi({
	endpoint: process.env.url + '/wp-json/',
	username: process.env.WP_USERNAME,
	password: process.env.WP_PASSWORD
});
const commandLineArgs = require('command-line-args')
//First validate command line arguments
const optionDefinitions = [
	{name: 'id', alias: 'i', type: Number},
	{name: 'year', alias: 'y', type: Number}
];
const options = commandLineArgs(optionDefinitions);


if (!('year' in options && 'id' in options)){
	console.log('You must supply a year and id as command line arguments');
	process.exit();
}

//Load .env


//Load relevant xml file
const xmlFileName = 'Content-' + options.year + '.xml';

convert.xmlFileToJSON(
	'xmlFiles/' + xmlFileName, 
	{
		strict: false,
		normalizeTags: true,
		tagNameProcessors: [
			function (name){
				if (name.substr(0, 3) === 'fn:') return name.substr(3);
				return name;
			}
		]
	}
)
.then(json => {
	console.log('Searching for ' + options.id + ' in ' + xmlFileName + '...');
	//Search for id in resulting json
	items = json.rss.channel[0].item;
	var article = items.find(item => {
		return Number(item.oid[0]) === options.id;
	});
	if (typeof article === 'undefined') return Promise.reject('Could not find article with id ' + options.id);
	//Found the article
	//Make sure it isn't posted already
	return Promise.resolve(article);
})
.then(article => {
	console.log('Creating post...');
	//Time to post it to wordpress
	
	//Format the images
	article = formatImages(article);
	//Create the json for the post
	var postJSON = {
		title: article.title[0],
		content: article.body[0],
		date: article.creation_date[0],
		slug: slugify(article.title[0]) + '-' + article.oid[0],
		status: 'draft',
		ocw_author: 'author' in article ? titleCase(article.author[0]) : null
	};
	return wp.posts().create(postJSON)
})
.then(result => {
	var editUrl = process.env.URL + '/wp-admin/post.php?post=' + result.id + '&action=edit';
	opn(editUrl);
})
.catch(err => console.log(err));



function slugify(text)
{
  // replace non letter or digits by -
  text = text.replace('~[^\pL\d]+~u', '-');

  // transliterate
  //$text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);

  // remove unwanted characters
  text = text.replace('~[^-\w]+~', '');

  // trim
  text = text.trim();

  // remove duplicate -
  text = text.replace('~-+~', '-');

  // lowercase
  text = text.toLowerCase();

  if (!text) {
    return 'n-a';
  }

  return text;
}



function formatImages(article){
	if (!('image' in article)) return;
	var imageCount = article.image.length;
	//Get image urls
	var imageUrls = article.image.map(image => {
		var url = new URL(image.url[0]);
		//Process image url
		var path = url.pathname.split('/');
		var imageName = path.pop();
		var imageId = path.pop();
		return 'https://www.ocweedly.com/wp-content/uploads/' + imageId + '_' + imageName;
	});
	//Replace each instance of [image-?] with an html image tag
	var replaced = 0; //Number of images replaced, to make sure the number of image urls matched the number of [image] tags in the body
	var regex = RegExp(/\[image\-\d+\]/);
	body = article.body[0];
	for (replaced = 0 ; regex.test(body) ; replaced++){
		var imageUrl = imageUrls.shift();
		var imageTag = '<image src="' + imageUrl + '" />';
		body = body.replace(regex, imageTag);
	}
	if (replaced !== imageCount){
		console.log('There was an error. Found ' + imageCount + ' image(s), but replaced ' + replaced);
	}
	article.body[0] = body;
	return article;
}


/*


var articleIds = [];

convert.xmlFileToJSON('')
.then(json => console.log(json));

wp.posts()
.then(data => {
	console.log('it works');
})
.catch(err => console.log(err));
*/