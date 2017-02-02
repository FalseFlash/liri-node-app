"use strict";

const keys = require('./keys');
const io = require('fs');
const readline = require('readline');
const path = require('path');
const req = require('request');
const Twitter = require('twitter');
const colors = require('colors');
const moment = require('moment');

const twitterKeys = keys.twitterKeys;

const randomTextFile = path.join(__dirname, 'random.txt');

const file = readline.createInterface({
    input: io.createReadStream(randomTextFile),
    output: process.stdout,
    terminal: false
});

let command = process.argv[2];
let commandString = process.argv[3];
let extraCommands = process.argv[4];

let preventWrite = false;

const twitter = new Twitter(twitterKeys);

//----------------------------------------------------------------------

/**
 * Application entry point.
 */
const main = () => {
    if (!command) {
        console.warn('A valid command is needed to run this program.'.red);
        console.warn('\n1. my-tweets - This will show your last 20 tweets and when they were created at in your terminal/bash window.\n2. spotify-this-song [song name] [optional list count] - This will show song information in your terminal/bash window.\n3. movie-this [movie name] - This will show movie information in your terminal/bash window.\n4. do-what-it-says - This will run commands from random.txt file.'.green);
        return;
    }

    return runCommand(command);
};

/**
 * Commands to be ran.
 * @param command
 */
const runCommand = (command) => {
    switch (command) {
        case "my-tweets":
            myTweets();
            logCommand('my-tweets', '', '');
        break;

        case "spotify-this-song":
            searchSpotifySong(commandString, parseInt(extraCommands) ? parseInt(extraCommands) : 1);
            logCommand('spotify-this-song', `${commandString}`, extraCommands);
        break;

        case "movie-this":
            searchMovieAPI(commandString);
            logCommand('movie-this',  commandString ? commandString : '', '');
        break;

        case "do-what-it-says":
            readRandomTextFile();
        break;

        default:
            console.warn(`Unable to find the command ${command}`.red);
        return;
    }
};

/**
 * Get tweets from the selected user.
 * @param username
 */
const myTweets = (username = 'totallypr') => {
    twitter.get('statuses/user_timeline', {
        screen_name: username.trim(),
        count: 20
    }, function (error, tweets) {
        if(error)
            throw error;

        let i = 0;
        tweets.forEach(function() {
            let time = moment(tweets[i].created_at, 'dd MMM DD HH:mm:ss ZZ YYYY', 'en').format('MM/DD/YYYY hh:mm A');

            console.log(`${time}: ${tweets[i].text}`);
            i++;
        });

        i = 0;
    });
};

/**
 * Get information about a song from the Spotify API.
 * @param song
 * @param listLimit
 */
const searchSpotifySong = (song = 'the sign', listLimit = 1) => {
        if(!song)
            throw new Error('Missing song title');

    req(`https://api.spotify.com/v1/search?type=track&q=${song}&limit=20`, function (err, res) {
        if (err)
            throw new err;

        const json = JSON.parse(res.body);

        let curListCount = 0;

        json.tracks.items.some(function(data) {
            let info = data;
            let artistName = info.artists[0].name;
            let songName = info.name;
            let prev_URL = info.preview_url;
            let album = info.album.name;

            if (songName.toLowerCase() == song.toLowerCase()) {
                console.log(`Song: ${songName}\nArtist Name: ${artistName}\nAlbum: ${album}\nPreview URL: ${prev_URL}\n`);

                curListCount++;
                if (curListCount == listLimit)
                    return true;  // Break out of the loop if we reach the listing limit.
            }
        });

        if (curListCount == 0)
            return console.log(`We could not find the song you were looking for.`.yellow);

    });
};

/**
 * Searching the movie API for information.
 * @param movie
 */
const searchMovieAPI = (movie = 'mr nobody') => {
       /* Title of the movie.
        Year the movie came out.
        IMDB Rating of the movie.
        Country where the movie was produced.
        Language of the movie.
        Plot of the movie.
        Actors in the movie.
        Rotten Tomatoes Rating.
        Rotten Tomatoes URL.*/

    req(`http://www.omdbapi.com/?t=${movie}&plot=short&r=json&tomatoes=true`, function (err, res) {
        const json = JSON.parse(res.body);

        const title = json.Title;
        const year = json.Year;
        const imdbRating = json.imdbRating;
        const plot = json.Plot;
        const actors = json.Actors;
        const tomatoRating = json.tomatoRating;
        const tomatoURL = json.tomatoURL;

        console.log(`Title: ${title}\nYear: ${year}\nIMDB Rating: ${imdbRating}\nPlot: ${plot}\nActors: ${actors}\nTomato Rating: ${tomatoRating}\nTomato URL ${tomatoURL}`);
    });
};

/**
 * Read the random.txt file.
 */
const readRandomTextFile = () => {
    preventWrite = true;

    file.on('line', function(data) {
        let split = data.split(',');

        command = split[0];
        commandString = split[1];
        extraCommands = split[2];

        runCommand(command);
    });
};

/**
 * Log the command to file.
 * @param command
 * @param commandValue
 * @param extraCommands
 * @param callback
 */
const logCommand = (command, commandValue, extraCommands, callback) => {
    if (preventWrite === true)
        return;

    if (command == null || commandValue == null)
        throw new TypeError('Missing params');

    if (command == 'do-what-it-says')
        throw new Error('Command will result in a loop');

    if (extraCommands !== '')
        io.appendFile(randomTextFile, `\n${command},${commandValue},${extraCommands}`, function(err) {
            if (err)
                throw err;
        });
    else
        io.appendFile(randomTextFile, `\n${command},${commandValue}`, function(err) {
            if (err)
                throw err;
        });

    if(callback)
        callback();
};

// Runs when the program is started.
main();