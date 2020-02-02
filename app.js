//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true,
}));

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const User = mongoose.model("User", userSchema);

app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = req.body.password;
  console.log("Email: " + username);
  console.log("Pass: " + password);
  User.findOne({email: username}, function(err, user){
    if (err){
      console.log(err);
      return;
    }
    if (user){
      console.log(user.password);
      bcrypt.compare(password, user.password, function(err, result){
        if ( result == true){
          console.log("Match!");
          res.render("secrets");
        }
      });
    }
  });
});

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  console.log("Email: " + req.body.username);
  console.log("Pass: " + req.body.password);
  bcrypt.hash(req.body.password, saltRounds, function(err, hash){
    if (err)
    {
      console.log(err);
      return;
    }
    const user = new User({
      email: req.body.username,
      password: hash
    });
    user.save(function(err){
      if (err){
        console.log(err);
        return;
      }
      res.render("secrets");
    });
  });
});

app.listen(3000, function(){
  console.log("Listening on port 3000.");
});
