require("dotenv").config();
const fetch = require('node-fetch');
const mysql = require("mysql2");
const express = require("express");
var cron = require('cron');
const fs = require("fs");
const db = require('./config/db');
const dbpromise = db.promise();
const app = express();


function isNotEmptyObject(obj) {
    return Object.keys(obj).length;


}


var movies = [];
var updates = [];
var updatenodate = [];

const tmdbapikey = process.env.API_KEY;
const gte_date = '2022-01-01';
const lte_date = '2023-12-31';

function updatelist() {

    async function getmovies() {
        //  Fetch amount of pages
        try {
            let getpages = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${tmdbapikey}&primary_release_date.gte=${gte_date}&primary_release_date.lte=${lte_date}&vote_average.gte=5.5&with_genres=27`);
            let pagedata = await getpages.json();
            let pages = pagedata.total_pages;

            console.log(pagedata)

            let count = 0;
            // Loop through all pages
            for (let page = 1; page <= pages; page++) {
                const getresults = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${tmdbapikey}&page=${page}&primary_release_date.gte=${gte_date}&primary_release_date.lte=${lte_date}&vote_average.gte=5.5&with_genres=27`);
                let data = await getresults.json();
            

                for (let i = 0; i < data.results.length; i++) {
                    // Check if there are any providers for each movie
                    const getproviders = await fetch(`https://api.themoviedb.org/3/movie/${data.results[i].id}/watch/providers?api_key=${tmdbapikey}`);
                    let providers = await getproviders.json();


                    // Check if movie is streamable
                    let streamable = false;
                    if (isNotEmptyObject(providers.results)) {
                        streamable = true;
                    }
                    // Check if there is a poster
                    poster = null;
                    poster = data.results[i].poster_path;
                    if (poster == null) {
                        poster = "N/A";
                    }
                    // Check if there is a synopsis
                    synopsis = null;
                    synopsis = data.results[i].overview;
                    if (synopsis == null) {
                        synopsis = "N/A"
                    }
                    // Check if there is a digital release date
                    const getstreamabledate = await fetch(`https://api.themoviedb.org/3/movie/${data.results[i].id}/release_dates?api_key=${tmdbapikey}`)
                    let streamabledate = await getstreamabledate.json();

                    // Loop through all release dates
                    let objects = streamabledate.results
                    var streaming_dates = [];
                    objects.forEach((element) => {
                        for (let index = 0; index < element.release_dates.length; index++) {
                            if (element.release_dates[index].type == 4) {
                                streaming_dates.push(new Date(element.release_dates[index].release_date));
                            }
                        }
                    })
                    // If there are digital release dates, pick oldest
                    if (isNotEmptyObject(streaming_dates)) {
                        primary_streaming_timestamp = (new Date(Math.min.apply(null, streaming_dates)));
                        primary_streaming_date = primary_streaming_timestamp.getFullYear() + '-' + (primary_streaming_timestamp.getMonth() + 1) + '-' + primary_streaming_timestamp.getDate();
                    }
                    else {
                        primary_streaming_date = null;
                    }

                    const getexternalids = await fetch(`https://api.themoviedb.org/3/movie/${data.results[i].id}/external_ids?api_key=${tmdbapikey}`)
                    let externalids = await getexternalids.json();


                    // Push all movie data into an array
                    console.log(data.results[i].id, data.results[i].title + ` Release date: ${data.results[i].release_date} Synopsis: ${data.results[i].overview} Poster: ${data.results[i].poster_path} streamable: ${streamable} ` + count,);
                    count++;
                    var release_moment = new Date(data.results[i].release_date);
                    var release_date = release_moment.getFullYear() + '-' + (release_moment.getMonth() + 1) + '-' + release_moment.getDate();
                    movies.push({ ID: data.results[i].id, imdbID: externalids.imdb_id, Title: data.results[i].title, Synopsis: synopsis, Poster: poster, release_date: release_date, streamable: streamable, streamable_date: primary_streaming_date, lastmodified: new Date() });
                    
                }
            }
            console.log(count);
        }
        catch (err) {
            console.log(err);
        }
    }

    async function lookupdb() {
        try {
            const [rows, fields] = await dbpromise.query("SELECT * FROM movies");
            // Check if movies found in API results, are already in database.
            // If it's there and database has it listed as not streamable but it has become available, add it to the updates array.
            let count = 0;
            i = movies.length;
            while (i--) {
                if (rows.find(movie => movie.id == movies[i].ID)) {
                    count++
                    let queryindex = rows.findIndex(movie => movie.id == movies[i].ID)
                    let movie = movies[i];
                    movies.splice(i, 1);
                    if (movie.streamable && !rows[queryindex].streamable) {
                        if(movie.streaming_release_date != null)
                        updates.push({ streamable: movie.streamable, lastmodified: movie.lastmodified, streaming_release_date: primary_streaming_date, id: movie.ID });
                        else{
                            updatenodate.push({ streamable: movie.streamable, lastmodified: movie.lastmodified, id: movie.ID});
                        }

                    }

                }
            }

        }
        catch (err) {
            console.log(err);
        }

    }
    async function updatedb() {
        await getmovies();
        await lookupdb();
        // Update movies table
        
        for (i = 0; i < updates.length; i++) {
            let sql = "UPDATE movies SET streamable =? , lastmodified =? streaming_release_date =?  WHERE id =?";
            db.query(sql, Object.values(updates[i]), (err, result) => {
                if (err) throw err;
            });
        }
   
        for (i = 0; i < updatenodate.length; i++) {
            let sql= "UPDATE movies SET streamable =? , lastmodified =?  WHERE id =?";
            db.query(sql, Object.values(updatenodate[i]), (err, result) => {
                if (err) throw err;
            });
        }
        console.log("Updated " + updates.length + " movie(s)");

        var moviearray = [];
        for (i = 0; i < movies.length; i++) {
            moviearray.push(Object.values(movies[i]));
        }

        // Insert new movies into database
        if (isNotEmptyObject(moviearray)) {
            let sql = 'INSERT INTO movies (id, imdbid, title, synopsis, poster, release_date, streamable, streaming_release_date, lastmodified) VALUES ?';
            db.query(sql, [moviearray], (err, result) => {
                if (err) throw err;
                console.log("Added " + moviearray.length + " movie(s) to the database.");

            });
        }

    }

    updatedb()


}
var CronJob = require('cron').CronJob;
var job = new CronJob(
    '0 12,18 * * *',
    updatelist,
    'Europe/Amsterdam'
);

job.start();

updatelist();

exports.updatelist = updatelist;

app.use(express.json());

app.use("/", require("./routes/postRoutes"));

app.use((err, req, res, next) => {
    console.log(err.stack);
    console.log(err.name);
    console.log(err.code);

    res.status(500).json({
        message: "Something went really wrong",
    });
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

