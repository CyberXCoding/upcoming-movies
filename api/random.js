const fetch = require('node-fetch');
const { getAllMovies } = require('./utils/movieScraper');

const OMDB_API_KEY = '4d146d7';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

// Helper function to check if movie is upcoming
function isUpcomingMovie(omdbData) {
  const currentYear = new Date().getFullYear();
  
  // Check 1: Year should be current or future (2025, 2026, 2027...)
  if (omdbData.Year) {
    const yearMatch = omdbData.Year.match(/(\d{4})/);
    if (yearMatch) {
      const movieYear = parseInt(yearMatch[1]);
      if (movieYear < currentYear) {
        return false; // Old movie
      }
    }
  }
  
  // Check 2: Should be movie, not series/game/episode
  if (omdbData.Type && omdbData.Type !== 'movie') {
    return false;
  }
  
  // Check 3: Released date check
  if (omdbData.Released && omdbData.Released !== 'N/A') {
    const releasedDate = new Date(omdbData.Released);
    const today = new Date();
    
    // If already released and more than 30 days old, skip
    if (releasedDate < today) {
      const daysDiff = (today - releasedDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        return false; // Released more than 30 days ago
      }
    }
  }
  
  return true; // Looks like upcoming movie
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get LIVE upcoming movies from scraping sources
    const moviesData = await getAllMovies();
    
    if (!moviesData.success || !moviesData.movies || moviesData.movies.length === 0) {
      return res.status(503).send(JSON.stringify({
        Response: "False",
        Error: "Unable to fetch upcoming movies at this time. Please try again later."
      }, null, 2));
    }

    // Extract movie titles
    const moviesList = moviesData.movies.map(m => m.title);
    
    // Try up to 5 times to find a valid upcoming movie
    let attempts = 0;
    let maxAttempts = 5;
    let validMovie = null;
    
    while (attempts < maxAttempts && !validMovie) {
      // Pick random movie from scraped list
      const randomMovie = moviesList[Math.floor(Math.random() * moviesList.length)];
      
      // Fetch from OMDB
      const omdbUrl = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(randomMovie)}`;
      const omdbResponse = await fetch(omdbUrl);
      const omdbData = await omdbResponse.json();
      
      // Check if found and validate it's upcoming
      if (omdbData.Response === "True") {
        if (isUpcomingMovie(omdbData)) {
          validMovie = omdbData;
          break;
        } else {
          console.log(`Skipped ${randomMovie} - Not an upcoming movie (Year: ${omdbData.Year}, Type: ${omdbData.Type})`);
        }
      } else {
        console.log(`${randomMovie} not found in OMDB`);
      }
      
      attempts++;
    }
    
    // If found valid upcoming movie
    if (validMovie) {
      return res.status(200).send(JSON.stringify(validMovie, null, 2));
    }
    
    // If no valid movie found after attempts
    return res.status(404).send(JSON.stringify({
      Response: "False",
      Error: "No valid upcoming movie found in OMDB database after multiple attempts.",
      Note: "Try again - we have " + moviesList.length + " upcoming movies in our list",
      TotalAttempts: attempts
    }, null, 2));

  } catch (error) {
    console.error('Error in random endpoint:', error);
    return res.status(500).send(JSON.stringify({
      Response: "False",
      Error: error.message
    }, null, 2));
  }
};
