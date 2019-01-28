var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var mongojs = require('mongojs');


// Our scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var news = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Database configuration
var databaseUrl = "news";
var collections = ["latestNews"];

// Hook mongojs config to db variable
var db = mongojs(databaseUrl, collections);

// Log any mongojs errors to console
db.on("error", function (error) {
  console.log("Database Error:", error);
});

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo db
mongoose.connect("mongodb://localhost/ScrapeApp", { useNewUrlParser: true });


// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.premierleague.com/news").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    var result = [];

    // Now, we grab every h2 within an article tag, and do the following:
    $("figcaption").each(function (i, element) {
      // Save an empty result object


      // Add the text and href of every link, and save them as properties of the result object
      var title = $(element)
        .children(".title")
        .text();
      var link = "https://www.premiereleague.com" + $(element)
        .parent()
        .parent()
        .attr("href");

      result.push({
        title: title,
        link: link
      });


      //Create a new Article using the `result` object built from scraping
      news.Article.create(result)
        .then(function (newsArticle) {
          // View the added result in the console
          console.log(newsArticle);
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the news
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  news.Article.find({})
    .then(function (newsArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(newsArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our news...
  news.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function (newsArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(newsArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  // Create a new note and pass the req.body to the entry
  news.Note.create(req.body)
    .then(function (newsNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return news.Article.findOneAndUpdate({ _id: req.params.id }, { note: newsNote._id }, { new: true });
    })
    .then(function (newsArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(newsArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on: http://localhost:3000");
});
