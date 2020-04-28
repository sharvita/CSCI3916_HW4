var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
//TODO: Review https://mongoosejs.com/docs/validation.html

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

var ActorSchema = new Schema({ ActorName: {type: String, required: true}, CharacterName: {type: String, required: true} })

// movie schema
var MovieSchema = new Schema({
    title: { type: String, required: true, index: { unique: true } },
    year: { type: Number, required: true },
    genre: {
        type:String,
        enum: ['Action', 'Adventure', 'Comedy', 'Drama',
            'Fantasy', 'Horror', 'Mystery', 'Thriller', 'Western'],
        required: true },
    actors: { type: [ActorSchema],
        validate: [ function(arr) {
            return arr.length >= 3
        }, 'Actors must contain at least 3 entries'],
        required: true
    },
    imageUrl: { type: String }
});

// return the model
module.exports = mongoose.model('Movie', MovieSchema);