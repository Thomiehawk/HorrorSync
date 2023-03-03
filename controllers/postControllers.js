const update = require("../main.js");
const db = require('../config/db');
const dbpromise = db.promise();
const mysql = require("mysql2");


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

exports.latestmovie = async (req, res, next) => {
    const [rows, fields] = await dbpromise.query("SELECT * FROM movies ORDER BY lastmodified DESC LIMIT 1");
    res.json(rows);
}