const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");



const app = express();


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
    })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/taskManagementDB', { useNewUrlParser: true });



const projectSchema = new mongoose.Schema({
    pid: Number,
    title: String,
});

const taskSchema = new mongoose.Schema({
    sno: Number,
    title: String,
    project: String,
    description: String,
    assignedto: String,
    assignedby: String,
    status: String
});

const userSchema = new mongoose.Schema({
   
    username: String,
    password: String,
    role: String

});



userSchema.plugin(passportLocalMongoose);


const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);
const User = mongoose.model('User', userSchema);


passport.use(User.createStrategy());


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




app.get("/", function (req, res) {
    res.render("home");
});



app.get("/registerAdmin", function (req, res) {
    res.render("RegisterAdmin");
});

app.get("/registerUser", function (req, res) {
    res.render("RegisterUser");
});

app.get("/AdminLogin", function (req, res) {
    
    res.render("AdminLogin");
});

app.get("/UserLogin", function (req, res) {
    res.render("UserLogin");
});


app.get("/AdminDashboard", function (req, res) {

    if (req.isAuthenticated()) {

        Project.find({}, function (err, projects) {

            Task.find({}, function (err, tasks) {

                User.find({role: "USER"}, function (err, users) {

                    res.render("AdminDashboard", { projectList: projects, taskList: tasks, userList: users, admin: req.user.username });

                });


            });

        });
    } else {
        res.redirect("/AdminLogin");
    }  

});

app.get("/UserDashboard", function (req, res) {

    if (req.isAuthenticated()) {

        Task.find({ assignedto: req.user.username }, function (err, tasks) {
            if (err) {
                console.log(err);
            } else {

                res.render("UserDashboard", { taskList: tasks, user: req.user.username });
            }

        });
    } else {
        res.redirect("/UserLogin");
    }

});




app.post("/", function (req, res) {

    if (req.body.role === "admin") {
        if (req.body.loginbtn === "clicked") {
            res.redirect("/AdminLogin");
        }
        else if (req.body.registerbtn === "clicked") {
            res.redirect("/RegisterAdmin");
        }
    }

    else if (req.body.role === "user") {
        if (req.body.loginbtn === "clicked") {
            res.redirect("/UserLogin");
        }
        else if (req.body.registerbtn === "clicked") {
            res.redirect("/RegisterUser");
        }
    }
});

app.post("/registerAdmin", function (req, res) {

    User.register({ username: req.body.username, role: "ADMIN"}, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/registerAdmin");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/AdminDashboard");
              
                
            });
        }
    });
});



app.post("/registerUser", function (req, res) {


    User.register({ username: req.body.username,role: "USER" }, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/registerUser");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/UserDashboard");
            });
        }
    });

});



app.post("/AdminLogin", function (req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password,
        
    });

    User.find({username: req.body.username},function(err,foundUser){
          if(err)
          {
              console.log(err);
          }
          else if(foundUser.length === 0)
          {
              res.send("User Not found");
          }
          else{
              
            req.login(user, (err) => {
                if (err) {
                  
                    console.log(err);
                } else {
                    passport.authenticate("local")(req, res, function(){
                        res.redirect("/AdminDashboard");
                    });
                }
            });
          }
    });
    
  
   

});




app.post("/UserLogin", function (req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password,
        
    });
   
    User.find({username: req.body.username},function(err,foundUser){
        if(err)
        {
            console.log(err);
        }
        else if(foundUser.length === 0)
        {
            res.send("User Not found");
        }
        else{
            
          req.login(user, (err) => {
              if (err) {
                
                  console.log(err);
              } else {
                  passport.authenticate("local")(req, res, function(){
                      res.redirect("/UserDashboard");
                  });
              }
          });
        }
  });
  
   

});


app.post("/createTask", function (req, res) {
  
    const Taskproject = req.body.project;
    const Tasktitle = req.body.taskTitle;
    const Taskdescription = req.body.taskDescription;
    const Taskuser = req.body.taskUser;
    const Taskcreater = req.user.username;

    Task.find().countDocuments({}, function (err, count) {
        if (err) console.log(err);
        else {

            currentSerialNo = count + 1;

            const newTask = new Task({
                sno: currentSerialNo,
                title: Tasktitle,
                project: Taskproject,
                description: Taskdescription,
                assignedto: Taskuser,
                assignedby: Taskcreater,
                status: "New"
            });



            newTask.save(function (err) {
                if (err) {
                    console.log(err);
                } else {

                 
                    res.redirect('/AdminDashboard');
                }
            });
        }
    });

});

app.post("/changeStatus", function (req, res) {
    const value = req.body.newChange;
    const splitArray = value.split(",");
    const selectedSno = splitArray[0];
    const newStatus = splitArray[1];

    Task.findOneAndUpdate(
        { sno: selectedSno },
        { $set: { status: newStatus } },
        { upsert: false },
        function (error, success) {
            if (error) {
                console.log(error);
            } else {
                res.cookie("auth", "true", { httpOnly: true });
                res.redirect('/UserDashboard');
            }
        });


});

app.post("/adminLogout", function (req, res) {
    req.logout();
    res.redirect("/");
});

app.post("/userLogout", function (req, res) {
    req.logout();
    res.redirect("/");
});

app.listen(3000, function () {
    console.log("listenening on port 3000");
});






