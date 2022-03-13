const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
let alert = require('alert');
const cookieParser = require("cookie-parser");
const { constants } = require("crypto");
var thisAdmin;
var thisUser;
var counter = 1;
var currentSessionAdmin = false;
var currentSessionUser = false;









const app = express();

mongoose.connect('mongodb://localhost:27017/taskManagementDB', { useNewUrlParser: true });

const adminSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

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
    name: String,
    email: String,
    password: String,

});

const secret = "Thisisourlittlesecret.";
adminSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

const Admin = mongoose.model('Admin', adminSchema);
const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);
const User = mongoose.model('User', userSchema);











app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());






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
    // currentSessionAdmin = true;
    res.render("AdminLogin");
});

app.get("/UserLogin", function (req, res) {
    res.render("UserLogin");
});


app.get("/AdminDashboard", function (req, res) {
     thisAdmin = req.cookies["email"];
    if (currentSessionAdmin === "true") {
       
        Project.find({}, function (err, projects) {

            Task.find({}, function (err, tasks) {

                User.find({}, function (err, users) {

                    res.render("AdminDashboard", { projectList: projects, taskList: tasks, userList: users, admin: thisAdmin });

                });


            });

        });
    } else {
        res.redirect("/AdminLogin");
    }

});

app.get("/UserDashboard", function (req, res) {
    
    thisUser = req.cookies["email"];
    
    res.clearCookie("email", { httpOnly: true });
    if (currentSessionUser === "true") {
        // conetext = "false";


        Task.find({ assignedto: thisUser }, function (err, tasks) {
            if (err) {
                console.log(err);
            } else {

                res.render("UserDashboard", { taskList: tasks, user: thisUser });
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

    Admin.findOne({ email: req.body.email }, function (err, foundAdmin) {
        if (foundAdmin) {
            alert("Admin already exists, Kindly Login.");
            res.redirect("/AdminLogin");
        }
        else {
            const newAdmin = new Admin({
                email: req.body.email,
                password: req.body.password
            });

            newAdmin.save(function (err) {
                if (err) {
                    console.log(err);
                } else {

                    // res.cookie("auth", "true", { httpOnly: true });
                    res.redirect('/AdminLogin');
                }
            });
        }
    });

});

app.post("/registerUser", function (req, res) {

    User.findOne({ email: req.body.email }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                alert("User already exists, Kindly Login.");
                res.redirect("/UserLogin");
            }
            else {
                const newUser = new User({
                    email: req.body.email,
                    password: req.body.password
                });

                newUser.save(function (err) {
                    if (err) {
                        console.log(err);
                    } else {


                        res.redirect('/UserLogin');
                    }
                });
            }
        }
    });

});



app.post("/AdminLogin", function (req, res) {
    thisAdmin = req.body.email;

    const thisPassword = req.body.password;
    Admin.findOne({ email: thisAdmin }, function (err, foundAdmin) {
        if (err) {
            console.log(err);
        } else {
            if ((foundAdmin) && (foundAdmin.password === thisPassword)) {
                currentSessionAdmin = "true";
                res.cookie("email", thisAdmin, { httpOnly: true });
                res.redirect('/AdminDashboard');


            } else {

                res.send("Invalid Email/Password.");
            }
        }


    });

});

app.post("/UserLogin", function (req, res) {
    thisUser = req.body.email;
    
    const thisPassword = req.body.password;
    User.findOne({ email: thisUser }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if ((foundUser) && (foundUser.password === thisPassword)) {
                
                currentSessionUser = "true";
                res.cookie("email", thisUser, { httpOnly: true });
                res.redirect('/UserDashboard');

            } else {

                res.send("Invalid Email/Password.");
            }
        }
    });

});


app.post("/createTask", function (req, res) {

    const Taskproject = req.body.project;
    const Tasktitle = req.body.taskTitle;
    const Taskdescription = req.body.taskDescription;
    const Taskuser = req.body.taskUser;
    const Taskcreater = thisAdmin;

    Task.find().countDocuments({},function (err, count) {
        if (err) console.log(err);
        else {
           
            currentSerialNo = count+1;

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
                    
                    res.cookie("auth", "true", { httpOnly: true });
                    res.redirect('/AdminDashboard');
                }
            });
        }
    });

});

app.post("/changeStatus", function (req, res) {
    var value = req.body.newChange;
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
    currentSessionAdmin = "false";
    res.redirect("/");
});

app.post("/userLogout", function (req, res) {
    currentSessionUser = "false";
    res.redirect("/");
});

app.listen(3000, function () {
    console.log("listenening on port 3000");
});






