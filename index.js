const express = require('express');
const app = express();
const SpotifyWebApi = require('spotify-web-api-node');
const tmi = require('tmi.js');
const jsonfile = require('jsonfile');
const prettyms = require('pretty-ms');
let config = jsonfile.readFileSync("./config.json");
const opts = {
    options: {
        debug: false,
    },
    connection: { 
        secure: true,
        reconnect: true
    },
    identity: {
        username: config.twitch.username,
        password: config.twitch.oauth_token,
    },
    channels: [config.twitch.channel]
};
const twitchChat = new tmi.Client(opts);


twitchChat.connect().then(() => {
    console.log(`Logged into Twitch chat and connected to ${config.twitch.channel}`);
});

twitchChat.on('message', onMessageHandler);

async function onMessageHandler(channel, tags, message, self)
{
    if (message.toLowerCase() === config.twitch.command) {
        songstring = await FormatSongString();
        twitchChat.say(channel, songstring);
    }
}

const scopes = [
    'user-read-playback-state',
    "user-read-currently-playing"
];

const spotifyApi = new SpotifyWebApi({
    redirectUri: 'http://localhost:9822/callback/spotify',
    clientId: config.spotify.client_id,
    clientSecret: config.spotify.client_secret
})



app.get('/login/spotify', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes))
});

app.get('/callback/spotify', (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;
  
    if (error) {
      console.error('Callback Error:', error);
      res.send(`Callback Error: ${error}`);
      return;
    }
  
    spotifyApi
      .authorizationCodeGrant(code)
      .then(data => {
        const access_token = data.body['access_token'];
        const refresh_token = data.body['refresh_token'];
        const expires_in = data.body['expires_in'];
        
        config.spotify.access_token = access_token;
        config.spotify.refresh_token = refresh_token;
        config.spotify.token_expires = new Date().getTime() + (expires_in * 1000);
        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);
        jsonfile.writeFile("./config.json", config, { spaces: 2 });
  
        console.log(
          `Sucessfully retrieved access token. Expires in ${expires_in} s.`
        );
        res.send('Success! You can now close the window.');
        FormatSongString();
  
        setInterval(async () => {
            RefreshSpotifyToken();
        }, expires_in / 2 * 1000);
      })
      .catch(error => {
        console.error('Error getting Tokens:', error);
        res.send(`Error getting Tokens: ${error}`);
      });
  });

app.listen(9822, () => {
    if (!config.spotify.access_token)
    {
        console.log("No Spotify token found! Open http://localhost:9822/login/spotify to authenticate with Spotify.")
    }
    else
    {
        spotifyApi.setRefreshToken(config.spotify.refresh_token)
        RefreshSpotifyToken();
        setInterval(async () => {
            RefreshSpotifyToken();
        }, 3600 / 2 * 1000);
    }
});


async function RefreshSpotifyToken()
{
    spotifyApi.setRefreshToken(config.spotify.refresh_token)
    const data = await spotifyApi.refreshAccessToken();
    const access_token = data.body['access_token'];
    console.log("Refreshing Spotify access token...");
    config.spotify.access_token = access_token;
    jsonfile.writeFile("./config.json", config, { spaces: 2 });
    spotifyApi.setAccessToken(access_token);
}

async function GetCurrentSong()
{
    var songinfo = {};
    songinfo.artists = [];
    const data = await spotifyApi.getMyCurrentPlaybackState().then(function(data) { return data; });
    if (data.statusCode == 200)
    {
        data.body.item.artists.forEach(artist => {
            songinfo.artists.push(artist.name);
        });
        songinfo.title = data.body.item.name;
        songinfo.local = data.body.item.is_local;
        songinfo.length = data.body.item.duration_ms;
        songinfo.progress = data.body.progress_ms;
        if (!songinfo.local)
        {
            songinfo.url = data.body.item.external_urls.spotify;
        }
        return songinfo;
    }
    else
    {
        return;
    }
};

async function FormatSongString()
{
    const songinfo = await GetCurrentSong();
    var songstring;
    if (songinfo != undefined)
    {
        const progress = prettyms(songinfo.progress, { colonNotation: true, secondsDecimalDigits: 0});
        const length = prettyms(songinfo.length, { colonNotation: true, secondsDecimalDigits: 0});
        songstring = `Current song: ${songinfo.artists.join(', ')} - ${songinfo.title} (${progress}/${length})`;
        if (songinfo.url) {
            songstring += ` - ${songinfo.url}`
        }
    }
    else
    {
        songstring = "No song currently playing (or unable to get song from Spotify)."
    }
    return songstring;
}

