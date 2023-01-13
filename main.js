const fetch = require('node-fetch');
const http = require('http');
const mongo = require('mongodb');

function isEmptyObject(obj) {
    return !Object.keys(obj).length;

}

const tmdbapikey = 'e1edf42af928427db563073d53ec0178';


async function updatelist() {

    //  Fetch amount of pages
    let getpages = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apikey}&release_date.gte=2021-01-01&release_date.lte=2022-12-31&vote_average.gte=5.5&vote_count.gte=100&with_genres=27`);
    let pagedata = await getpages.json();
    let pages = pagedata.total_pages;

    console.log(pages);
    let count = 0;
    // Loop through all pages
    for (let page = 1; page <= pages; page++) {
        const getresults = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apikey}&page=${page}&primary_release_date.gte=2021-01-01&primary_release_date.lte=2023-12-31&with_genres=27`);
        let data = await getresults.json();

        for (let i = 0; i < data.results.length; i++) {
            // Check if there are any providers for the movie
            const getproviders = await fetch(`https://api.themoviedb.org/3/movie/${data.results[i].id}/watch/providers?api_key=${apikey}`);
            let providers = await getproviders.json();

            let streamable = true;
            if (isEmptyObject(providers.results)){
                streamable = false;
            }

            console.log(data.results[i].id, data.results[i].original_title + ` streamable: ${streamable} ` + page,);
            count++;
        }
    }
    console.log(count);

}

updatelist();


const server = http.createServer((request, response) => {
    // response.write(`${noproviders}`);
    response.end(JSON.stringify(data));
});
const port = 8080;
server.listen(port);

console.log("Server running at http://localhost:%d", port);




