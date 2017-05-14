const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
	storage: multer.memoryStorage(),
	fileFilter(req, file, next) {
		const isPhoto = file.mimetype.startsWith('image/');
		if(isPhoto) {
			next(null, true);
		} else {
			next({ message: 'That filetype isn\'t allowed!' }, false);
		}
	}
};

// Home page
exports.homePage = (req, res) => {
	res.render('index')
};


// Add a new store
exports.addStore = (req, res) => {
	res.render('editStore', { title: 'Add Store' })
};

// Image upload
exports.upload = multer(multerOptions).single('photo');

// Resize photos
exports.resize = async (req, res, next) => {
	// Check if there is no new file to resize
	if( !req.file ){
		next(); // skip to the next middleware
		return;
	}
	const extension = req.file.mimetype.split('/')[1];
	req.body.photo = `${uuid.v4()}.${extension}`;

	// now we will resize photo
	const photo = await jimp.read(req.file.buffer);
	await photo.resize(800, jimp.AUTO);
	await photo.write(`./public/uploads/${req.body.photo}`);

	// once we have written photo to our filesystem, keep going!
	next();
}

// Create a new sotre
exports.createStore = async (req, res) => {
	const store = await (new Store(req.body)).save();
	req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
	res.redirect(`/store/${store.slug}`)
};

exports.getStores = async (req, res) => {
	// 1. Query database for a list of all stores
	const stores = await Store.find();
	res.render('stores', { title: 'Stores', stores} )
};

exports.editStore = async (req, res) => {
	// 1. Find the store given the ID
	const store = await Store.findOne({_id: req.params.id})
	// 2. Confirm they are the owner of the store
	// TODO Owners
	// 3. Render out the render form so the user can update their store
	res.render('editStore', { title: `Edit store ${store.name}`, store })
};

exports.updateStore = async (req, res) => {
	// 0. Set the location data to be a point
	req.body.location.type = 'Point';
	// 1. Find and update the store
	const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
		new: true, // return the new store instead of the old one
		runValidators: true
	}).exec(); // query, data, options
	req.flash('success', `Successfully updated <b>${store.name}</b>. <a href="/stores/${store.slug}" alt="${store.name}">View store →</a>`)
	res.redirect(`/stores/${store.id}/edit`)
	// Redirect them to the store and tell them it worked
};

exports.getStoreBySlug = async (req, res, next) => {
	const store = await Store.findOne({ slug: req.params.slug });
	// res.json(store)
	if(!store) return next();
	res.render('store', { store, title: store.name })
};

exports.getStoreByTag = async  (req, res, next) => {
	const tags = await Store.getTagsList();
	const activeTag = req.params.tag;
	res.render('tags', { tags, title: 'tags', activeTag })
}