# paf-game

A game made for Paf Le Meilleur, twitch streamer.
Players have to defend a made up rating for a movie that they picked out of a list. 
Then their real Letterboxd rating is revealed if it exists.

## Usage

Just serve the folder, then go to the root.

## Game data

To run the game, you need a `data/game.csv`. If you need to have up-to-date data, navigate the scripts folder and run:

```bash 
node --env-file=../.env generate-game-data.js
```

The `.env` file must have a `TMDB_API_KEY` variable which contains your TMDB API key.

It will run a series of scripts in order:

### collect-movies.js
Reads into the data folder's `watched.csv` and `ratings.csv` files to create `data/game.csv`. These files can be downloaded via the account data export feature of Letterboxd.

### fetch-missing-data.js
Fills in the popularity scores and poster url from the TMDB API.

### order-by-popularity.js
Orders the `data/game.csv` file by the popularity score, descending. It also prunes the "movies" without score (usually tv shows).

## Thanks
- TMDB for providing a great API and database dumps!

