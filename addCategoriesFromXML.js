require('dotenv').config();
const convert = require('xml-to-json-promise');
const readdir = require('fs-readdir-promise');
const wpapi = require( 'wpapi' );
const wp = new wpapi({
	endpoint: process.env.url + '/wp-json/',
	username: process.env.WP_USERNAME,
	password: process.env.WP_PASSWORD
});


var params = {path: null, categoryArray: []};

readdir(process.env.EVENT_XML_DIR)
.then(files => {
	//For all files in xmlFiles, Search for article using id
	return files.reduce((promise, file) => {
		return promise.then(() => getCategories({path: process.env.EVENT_XML_DIR + '/' + file, categoryArray: params.categoryArray}))
	}, Promise.resolve());
})
.then(() => {
	return params.categoryArray.reduce((promise, newCat) => {
		return promise.then(() => addCategoryIfDoesntExist(newCat));
	}, Promise.resolve());
})
.catch(console.log);


/*
var newCategories = [ 'News',
  'Arts',
  'Film',
  'Music',
  'Food',
  'Back to School',
  'Supplement',
  'Year in Review',
  'Unknown',
  'Health and Beauty',
  'Man Bites Dogma',
  'Mondo Washington',
  'Gift Guide',
  'Talk',
  'Grub Guide',
  'Web',
  'Business: general',
  'Calendar',
  'Contents',
  'The County',
  'Worst President Ever',
  'About OC Weekly',
  'Strapping Young Buck',
  'Navel Gazing',
  'Jobs',
  'Insiders',
  'Newsletter',
  'New Reviews',
  'Film Pick',
  'Contests',
  'Stick a Fork In It',
  'Heard Mentality',
  'Intro',
  'Bars & Clubs',
  'Food & Drink',
  'Arts & Entertainment',
  'People & Places',
  'Shopping & Services',
  'Readers\' Choice',
  'Sports & Recreation',
  'The OCeeker',
  'Alt-Med' ];
*/






function addCategoryIfDoesntExist(name){
	return new Promise((resolve, reject) => {
		wp.categories().create({name: name})
		.then(() => {
			console.log('Added ' + name);
			resolve();
		})
		.catch(() => {
			console.log(name + ' already exists');
			resolve();
		})
	});
}



function getCategories(args){
	var path = args.path;
	var categoryArray = args.categoryArray;
	return new Promise((resolve, reject) => {
		console.log('Finding categories in ' + path + ' . . .');
		convert.xmlFileToJSON(
			path, 
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
			items = json.rss.channel[0].item;
			items.forEach(item => {
				if (item.category){
					item.category.forEach(category => {
						var category_name = category.category_name[0];
						if (!categoryArray.includes(category_name)) categoryArray.push(category_name);
					});
				}
			});
			resolve();
		});
	});
}





function slugify(text){
  // replace non letter or digits by -
  text = text.replace(/[^A-Za-z\d]+/g, '-');

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