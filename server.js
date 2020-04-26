var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var mongoose = require('mongoose');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');
var jwt = require('jsonwebtoken');
var cors = require('cors');

// to retrieve username through token
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;

var app = express();
module.exports = app; // for testing
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

router.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            res.send(req.body);
        }
    );

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
            // return that user
            res.json(user);
        });
    });

router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users
            res.json(users);
        });
    });

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, message: 'Please pass username and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }

            res.json({ success: true, message: 'User created!' });
        });
    }
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    //userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });
    });
});

router.route('/movies')
    .get(authJwtController.isAuthenticated, function(req, res) {
        // return movies with reviews
        if (req.query.reviews) {
            if (req.query.title) {
                Movie.aggregate([
                    {
                        $lookup: {
                            from: 'reviews',
                            localField: 'title',
                            foreignField: 'movie_title',
                            as: 'reviews'
                        }
                    },
                    {
                        $match: { title: req.query.title }
                    }
                ]).exec( function(err, results) {
                    if (err) {
                        res.json({success: false, message: err.message});
                    }
                    else if (results[0] == null) {
                        res.json({success: false, message: "Movie not found"});
                    }
                    else {
                        res.json(results[0]);
                    }
                });
            }
            else {
                Movie.aggregate([
                    {
                        $lookup: {
                            from: 'reviews',
                            localField: 'title',
                            foreignField: 'movie_title',
                            as: 'reviews'
                        }
                    },
                    {
                        $addFields: { "avg_rating": {
                                $avg: "$reviews.rating"
                            }
                        }
                    },
                    {
                        $sort: { "avg_rating": -1 }
                    }
                ]).exec( function(err, results) {
                    if (err) {
                        res.json({success: false, message: err.message});
                    }
                    else {
                        res.json(results);
                    }
                });
            }
        }
        // return movies without reviews
        else {
            if (req.query.title) {
                Movie.findOne({title: req.query.title}, function (err, movie) {
                    if (err) {
                        res.json({success: false, message: err.message});
                    } else if (movie == null) {
                        res.json({success: false, message: "Movie not found"});
                    } else {
                        res.json(movie);
                    }
                });
            } else {
                Movie.find(function (err, movies) {
                    if (err) res.send(err);
                    // return the movies
                    res.json(movies);
                });
            }
        }
    })
    .post(authJwtController.isAuthenticated, function(req, res) {
        var movie = new Movie();
        movie.title = req.body.title;
        movie.year = req.body.year;
        movie.genre = req.body.genre;
        movie.actors = req.body.actors;
        movie.image = req.body.image;
        // save the movie
        movie.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({success: false, message: 'A movie with that title already exists.'});
                else
                    return res.json({success: false, message: err.message});
            }

            res.json({success: true, message: 'Movie has been successfully added!'});
        });
    })
    .put(authJwtController.isAuthenticated, function(req, res) {
        let updates = req.body;
        Movie.findOneAndUpdate({title: req.query.title}, updates, function(err, movie) {
            if(err) {
                res.json({success: false, message: err.message});
            }
            else if (movie == null) {
                res.json({success: false, message: "Movie not found"});
            }
            else {
                res.json({success: true, message: "Movie has been successfully updated!"});
            }
        });
    })
    .delete(authJwtController.isAuthenticated, function(req, res) {
        Movie.findOneAndDelete({title: req.query.title}, function(err, movie) {
            if (err) {
                res.json({success: false, message: err.message});
            }
            else if (movie == null) {
                res.json({success: false, message: "Movie not found"});
            }
            else {
                res.json({success: true, message: 'Movie has been successfully deleted!'});
            }

        })
    })
    .all(function(req, res) {
        res.status(405).send({
            success: false,
            message: "HTTP method " + req.method + " is not supported."
        })
    });


router.route('/movies/:movieId')
    .get(authJwtController.isAuthenticated, function(req, res) {
        if (req.query.reviews) {
            Movie.aggregate([
                {
                    $lookup: {
                        from: 'reviews',
                        localField: 'title',
                        foreignField: 'movie_title',
                        as: 'reviews'
                    }
                },
                {
                    $match: { _id: mongoose.Types.ObjectId(req.params.movieId) }
                },
                {
                    $addFields: { "avg_rating": {
                            $avg: "$reviews.rating"
                        }
                    }
                }
            ]).exec( function(err, results) {
                if (err) {
                    res.json({success: false, message: err.message});
                }
                else if (results[0] == null) {
                    res.json({success: false, message: "Movie not found"});
                }
                else {
                    res.json(results[0]);
                }
            });
        }
        else {
            Movie.findOne({_id: req.params.movieId}, function(err, movie) {
                if (err) {
                    res.json({success: false, message: err.message});
                } else if (movie == null) {
                    res.json({success: false, message: "Movie not found"});
                } else {
                    res.json(movie);
                }
            });
        }
    });


router.route('/reviews')
    .get(authJwtController.isAuthenticated, function(req, res) {
        if (req.query.title) {
            Review.find({ movie_title: req.query.title }, function(err, reviews) {
                if (err) {
                    res.json({success: false, message: err.message});
                }
                else if (reviews == null) {
                    res.json({success: false, message: "No reviews found"});
                }
                else {
                    res.json(reviews);
                }
            });
        } else {
            Review.find(function (err, reviews) {
                if (err) res.send(err);
                // return the reviews
                res.json(reviews);
            });
        }
    })
    .post(authJwtController.isAuthenticated, function(req, res) {
        var review = new Review();
        review.movie_title = req.body.movie_title;
        review.reviewer_name = req.user.username;
        review.quote = req.body.quote;
        review.rating = req.body.rating;
        // save the review
        Movie.findOne({title: review.movie_title}, function (err, movie) {
            if (err) {
                res.json({success: false, message: err.message});
            } else if (movie == null) {
                res.json({success: false, message: "Movie not found, cannot submit a review for a nonexistent movie"});
            } else {
                review.save(function(err) {
                    if (err) {
                        return res.json({success: false, message: err.message});
                    }
                    res.json({success: true, message: 'Review has been successfully added!'});
                });
            }
        });

    });


app.use('/', router);
app.listen(process.env.PORT || 8080);