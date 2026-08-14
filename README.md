# paf-game

A game made for Paf Le Meilleur, twitch streamer.
Players have to defend a made up rating for a movie that they picked out of a list. 
Then their real Letterboxd rating is revealed if it exists.

## Data collection

To run the game, you need a `collected.csv`. Here's how to regenerate it if you need to have up-to-date data:

Data collection works via a series of scripts that you must run in order:

### collect-movies.js
Reads into the data folder's `watched.csv` and `ratings.csv` files to create `collected.csv`. These files can be downloaded via the account data export feature of Letterboxd.

### parse-popularity.js
Reads into the data folder's `tmdb-movies.json` file to add the popularity column to `collected.csv`. This file is too big for git and has to be sourced here (replace the MM_DD_YYYY by yesterday's date): https://files.tmdb.org/p/exports/movie_ids_MM_DD_YYYY.json.gz

TMDB's dumps work with the original movie names while Letterboxd works with english localized names, so there will be misses.

### query-missing-popularity.js

To fill in the missing popularity scores, run this script. Note that you need to have a TMDB API KEY available in your env with the name `TMDB_API_KEY`.
If you have a modern version of Node, you can read an env file by running the script this way:
```bash 
node --env-file=.env query-missing-popularity.js
```

### order-by-popularity.js
Orders the `collected.csv` file by the popularity score, descending. It also prunes the "movies" without score (usually tv shows).

## Thanks
- TMDB for providing a great API and database dumps!

