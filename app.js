//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true,
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  // email: {type: String, sparse: true},
  // password: {type: String, sparse: true},
  googleID: {type: String, sparse: true},
  secret: {type: String, sparse: true}
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb){
    console.log("find or create");
    console.log(profile);
    User.findOrCreate({googleID: profile.id}, function (err, user){
      return cb(err, user);
    });
    // User.findOne({"googleID": profile.id}, function(err, user){
    //   if (err) {
    //     return cb(err);
    //   }
    //   if (!user){
    //     user = new User({
    //       googleID: profile.id
    //     });
    //     user.save(function(err){
    //       if (err) console.log(err);
    //       return cb(err, user);
    //     });
    //   } else {
    //     return cb(err, user);
    //   }
    // });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google", passport.authenticate("google", {scope: ['profile']}));

app.get("/auth/google/secrets",
  passport.authenticate("google", {failureRedirect: "/login"}),
  function (req, res){
    res.redirect("/secrets");
});

app.get("/login", function(req, res){
  if (req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.render("login");
  }
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err){
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err){
      console.log(err);
      res.redirect("/register");
    }
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  if (req.isAuthenticated()){
    console.log(req.user);
    const secret = req.body.secret;
    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = secret;
          foundUser.save(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
  }
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, users){
    if (err){
      console.log(err);
      return;
    }
    console.log(users);
    users.forEach(function(user, index){
      console.log(user.secret);
    });
    res.render("secrets", {users: users});
  });
});

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
});

app.listen(3001, function(){
  console.log("Listening on port 3000.");
});
