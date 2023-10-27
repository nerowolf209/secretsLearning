require('dotenv').config({path: __dirname + '/.env'});
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')


const app = express();
const port = 3000;

const dbName = "userTesting"

const dbPassword = process.env.DB_PASSWORD;
const dbUser = process.env.DB_USER;
// external db Connection
//const uri = "mongodb+srv://"+dbUser+":"+dbPassword+"@learningcluster.eufjoqu.mongodb.net/"+dbName+"?retryWrites=true&w=majority"

app.use(express.static('public'));
app.set('view engine','ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

// session initilization
app.use(session({
    secret: process.env.EN_SECRET,
    resave: false,
    saveUninitialized: false
}));

// passport initilization
app.use(passport.initialize());
// ask passport to use our session
app.use(passport.session());


// Local db Connection
const uri = `mongodb://127.0.0.1:27017/${dbName}`


const client = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    w: 'majority',
    wtimeoutMS: 10000,
    retryWrites: true,
  };


mongoose.connect(uri,client)
  .then(() => {
    console.log("mongoDB connected successfully");
  })
  .catch((err) => {
    console.log("Error while connecting", err);
  })

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets" //process.env.CALL_BACK_URL
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req,res){
    res.render("home");
});

app.get("/login", function(req,res){
    res.render("login");
});

app.get("/register", function(req,res){
    res.render("register");
});

app.get("/secrets", function(req,res){
    if(req.isAuthenticated()){
        res.render("secrets")
    } else {
        res.redirect("/login")
    }
    
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.post("/register", function(req,res){
    
    User.register({ username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            res.redirect("/register")
        } else {
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });

});

app.post("/login", async function(req,res){
    try {
        const result = await User.authenticate()(req.body.username, req.body.password);
        if(result.user){
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
            
        } else {
            console.error(result.error.message || "Password incorrect");
            res.redirect("/login");
        };
        // Authentication successful, 'user' contains the authenticated user
      } catch (err) {
        console.error('Authentication error:', err);
        res.redirect("/login");
        // Authentication failed, handle the error (err)
      }
});


app.get("/logout", function(req,res){
    req.logout(function(err){
        if (err) {
            console.error('Error during logout: ', err);
        } else {
            res.render("home");
        }
    })
    
})

app.listen(port, function(){
    console.log(`Server is running on port ${port}`)
})