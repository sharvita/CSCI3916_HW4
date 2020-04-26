var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
//TODO: Review https://mongoosejs.com/docs/validation.html

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// review schema
var ReviewSchema = new Schema({
    movie_title: { type: String, required: true },
    reviewer_name: { type: String, required: true },
    quote: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 }
});

// return the model
module.exports = mongoose.model('Review', ReviewSchema);