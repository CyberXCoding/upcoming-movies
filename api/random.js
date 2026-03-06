const fetch = require('node-fetch');
const { getAllMovies } = require('./utils/movieScraper');

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
    // Get LIVE upcoming movies (NO HARDCODED DATA!)
    const moviesData = await getAllMovies();
    
    // Check if scraping was successful
    if (!moviesData.success || !moviesData.movies || moviesData.movies.length === 0) {
      return res.status(503).json({
        success: false,
        error: "Unable to fetch upcoming movies at this time. Please try again later.",
        message: "Movie scraping failed or no upcoming movies found"
      });
    }

    // Extract only movie titles from live data
    const moviesList = moviesData.movies.map(m => m.title);

    // Pick a RANDOM movie from LIVE upcoming movies ONLY
    const randomMovie = moviesList[Math.floor(Math.random() * moviesList.length)];

    // Fetch details from OMDB
    const omdbUrl = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(randomMovie)}`;
    const omdbResponse = await fetch(omdbUrl);
    const omdbData = await omdbResponse.json();

    if (omdbData.Response === "False") {
      // Movie not found in OMDB, but still return info that it's an upcoming movie
      return res.status(200).json({
        success: true,
        movie: {
          title: randomMovie,
          year: "N/A",
          releaseDate: "Upcoming",
          rated: "N/A",
          runtime: "N/A",
          genre: [],
          director: "N/A",
          writer: "N/A",
          actors: [],
          plot: "This is an upcoming movie. Detailed information not yet available in OMDB database.",
          language: [],
          country: [],
          poster: null,
          ratings: [],
          imdbRating: "N/A",
          imdbVotes: "N/A",
          imdbID: "N/A",
          metascore: "N/A",
          awards: "N/A",
          boxOffice: "N/A",
          production: "N/A",
          type: "movie",
          dvd: "N/A",
          website: "N/A"
        },
        metadata: {
          fetchedAt: new Date().toISOString(),
          source: "Live Scraped Data",
          omdbStatus: "Not Found",
          randomlySelected: true,
          totalAvailableMovies: moviesList.length,
          note: "This movie was found in upcoming releases but doesn't have OMDB data yet"
        }
      });
    }

    // Clean and format the response with OMDB data
    const cleanData = {
      success: true,
      movie: {
        title: omdbData.Title || randomMovie,
        year: omdbData.Year || "N/A",
        releaseDate: omdbData.Released || "Upcoming",
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
        source: "Live Scraped Data + OMDB API",
        omdbStatus: "Found",
        randomlySelected: true,
        totalAvailableMovies: moviesList.length
      }
    };

    return res.status(200).json(cleanData);

  } catch (error) {
    console.error('Error in random endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error while fetching random movie"
    });
  }
};
