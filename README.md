# Simple Spotify Twitch Bot
Simple Twitch bot that displays the currently playing song on a specific Spotify account.
![Example](https://i.imgur.com/Dst1zrb.png)

# Setup
Clone the repository, run `npm install` and fill in the necessary information in the `config.json` file.

### Config file
The config file requires this info:
* Spotify app client ID and secret (which you can get from the [Spotify Developer Site](https://developer.spotify.com/))
* Username and OAuth token (which you can get [here](https://twitchapps.com/tmi/)) of the account you want to use for the bot
* Name of the channel you want the bot account to join and post in
* Command you want to use to trigger the bot

The correct syntax of the config file is the following:
```json
{
  "spotify": {
    "client_id": "<Spotify client ID>",
    "client_secret": "<Spotify client secret>",
  },
  "twitch": {
    "username": "<Twitch username of the account you want to use for the bot>",
    "channel": "<Channel you want the bot to join and post in>",
    "oauth_token": "<OAuth token to log into the bot account>",
    "command": "!song"
  }
}
```