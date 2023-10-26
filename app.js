require('dotenv').config({path: __dirname + '/.env'})
const express = require("express")
const ejs = require("ejs")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const saltRounds = 10


const app = express();
const port = 3000;

const dbName = "userTesting"

const dbPassword = process.env.DB_PASSWORD;
const dbUser = process.env.DB_USER;
// external db Connection
//const uri = "mongodb+srv://"+dbUser+":"+dbPassword+"@learningcluster.eufjoqu.mongodb.net/"+dbName+"?retryWrites=true&w=majority"

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
    password: String
});




const User = new mongoose.model("User", userSchema);

app.use(express.static('public'));
app.set('view engine','ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));


app.get("/", function(req,res){
    res.render("home");
});

app.get("/login", function(req,res){
    res.render("login");
});

app.get("/register", function(req,res){
    res.render("register");
});


app.post("/register", function(req,res){
    // console.log(req.body)
    

    try{
        bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
            const newUser = new User({
                email: req.body.username,
                password: hash
        })
        newUser.save()
        res.render("secrets")
        });
    } catch(error){
        console.log(error.response.error)
        res.redirect("/")
    }
});

app.post("/login", async function(req,res){
    // console.log(req.body)
    const username = req.body.username
    const password = req.body.password
    try{
        const foundUser = await User.findOne({
            email: username
        });
        if (foundUser){
            const passwordMatch = await bcrypt.compare(password, foundUser.password);
                    if(passwordMatch){
                    res.render("secrets");
                    }else {
                        console.error("password incorrect")
                        res.redirect("login")
                    }
            } else {
            console.error("user not found");
            res.redirect("/login");
        }
        
    }catch(error){
        console.log(error.response.error)
        res.redirect("/")
    }
})


app.get("/logout", function(req,res){
    res.render("home");
})

app.listen(port, function(){
    console.log(`Server is running on port ${port}`)
})