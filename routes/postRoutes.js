const express = require('express');
const postControllers = require('../controllers/postControllers')
const router = express.Router();

//  @route GET && POST - /posts/
router
    .route("/")
    .get(postControllers.getAllPosts)
    .post(postControllers.createNewPost);

router.route("/update").get(postControllers.updatelist);
router.route("/movie/:query").get(postControllers.getPostById);

module.exports = router;
