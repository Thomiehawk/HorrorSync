const update = require("../main.js");

exports.getAllPosts = async (req, res, next) => {
    res.send("Get all posts route")
}

exports.createNewPost = async (req, res, next) => {
    res.send("Create New post route");
}

exports.getPostById =   async (req, res, next) => {
    res.send("Get post by ID route");
}

exports.updatelist = async ( req, res, next) =>{
    res.send("Updating movie list");
    update.updatelist();
}