const fetch = require('node-fetch');

const OMDB_API_KEY = '4d146d7';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // First, get list of upcoming movies
    const moviesResponse = await fetch(`${req.headers.host || 'localhost:3000'}/api/movies`);
    
    // Fallback: if can't fetch from our API, use some popular upcoming movies
    let moviesList = [];
    
    try {
      const moviesData = await moviesResponse.json();
      if (moviesData.success && moviesData.movies.length > 0) {
        moviesList = moviesData.movies.map(m => m.title || m);
      }
    } catch (e) {
      // Fallback list
      moviesList = [
        "Avengers: Doomsday",
        "Ramayana Part 1",
        "Toxic",
        "Vishwambhara",
        "Mortal Kombat II",
        "Ustaad Bhagat Singh",
        "Dacoit"
      ];
    }

    // Pick a random movie
    const randomMovie = moviesList[Math.floor(Math.random() * moviesList.length)];

    // Fetch details from OMDB
    const omdbUrl = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(randomMovie)}`;
    const omdbResponse = await fetch(omdbUrl);
    const omdbData = await omdbResponse.json();

    if (omdbData.Response === "False") {
      return res.status(404).json({
        success: false,
        error: `Movie "${randomMovie}" not found in OMDB database`,
        searchedTitle: randomMovie,
        suggestion: "Try another random request or the movie data may not be available yet"
      });
    }

    // Clean and format the response
    const cleanData = {
      success: true,
      movie: {
        title: omdbData.Title || "N/A",
        year: omdbData.Year || "N/A",
        releaseDate: omdbData.Released || "N/A",
        rated: omdbData.Rated || "N/A",
        runtime: omdbData.Runtime || "N/A",
        
        genre: omdbData.Genre ? omdbData.Genre.split(', ') : [],
        
        director: omdbData.Director || "N/A",
        writer: omdbData.Writer || "N/A",
        actors: omdbData.Actors ? omdbData.Actors.split(', ') : [],
        
        plot: omdbData.Plot || "N/A",
        
        language: omdbData.Language ? omdbData.Language.split(', ') : [],
        country: omdbData.Country ? omdbData.Country.split(', ') : [],
        
        poster: omdbData.Poster !== "N/A" ? omdbData.Poster : null,
        
        ratings: omdbData.Ratings || [],
        imdbRating: omdbData.imdbRating || "N/A",
        imdbVotes: omdbData.imdbVotes || "N/A",
        imdbID: omdbData.imdbID || "N/A",
        
        metascore: omdbData.Metascore || "N/A",
        
        awards: omdbData.Awards || "N/A",
        
        boxOffice: omdbData.BoxOffice || "N/A",
        production: omdbData.Production || "N/A",
        
        type: omdbData.Type || "movie",
        
        dvd: omdbData.DVD || "N/A",
        website: omdbData.Website || "N/A"
      },
      
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: "OMDB API",
        randomlySelected: true,
        totalAvailableMovies: moviesList.length
      }
    };

    return res.status(200).json(cleanData);

  } catch (error) {
    console.error('Error in random endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
