const cheerio = require('cheerio');
const fetch = require('node-fetch');

// Multiple RELIABLE sources for UPCOMING movies ONLY
const sources = [
  {
    name: 'Sacnilk',
    url: 'https://sacnilk.com/entertainmenttopbar/Upcoming_Movies',
    parser: parseSacnilk
  },
  {
    name: 'BookMyShow',
    url: 'https://in.bookmyshow.com/explore/movies-coming-soon',
    parser: parseBookMyShow
  },
  {
    name: 'IMDb Upcoming',
    url: 'https://www.imdb.com/calendar/?region=IN&type=MOVIE',
    parser: parseIMDb
  }
];

// Parse Sacnilk
function parseSacnilk($) {
  const movies = [];
  let isUpcomingSection = false;

  $('h1, h3').each((index, element) => {
    const text = $(element).text().trim();
    
    if (text.includes('🎬 Upcoming Movies') || text.includes('Upcoming Movies')) {
      isUpcomingSection = true;
      return;
    }

    if (isUpcomingSection && $(element).is('h3')) {
      if (
        text && 
        text.length > 0 &&
        !text.includes('Sacnilk') &&
        !text.includes('Quick Links') &&
        !text.includes('Industries') &&
        !text.includes('Support') &&
        !text.includes('Enjoying our content') &&
        !text.includes('Box Office') &&
        !text.includes('News')
      ) {
        movies.push(text);
      }
    }
  });

  return movies;
}

// Parse BookMyShow
function parseBookMyShow($) {
  const movies = [];
  
  // BookMyShow uses various selectors for movie titles
  $('a[href*="/movies/"] h3, .movie-card-title, .coming-soon-movie h3').each((index, element) => {
    const text = $(element).text().trim();
    if (text && text.length > 0 && text.length < 100) {
      movies.push(text);
    }
  });

  return movies.slice(0, 25);
}

// Parse IMDb
function parseIMDb($) {
  const movies = [];
  
  // IMDb calendar page structure
  $('.list-item h4 a, .ipc-title__text').each((index, element) => {
    const text = $(element).text().trim();
    // Remove numbering like "1. Movie Name"
    const cleaned = text.replace(/^\d+\.\s*/, '');
    if (cleaned && cleaned.length > 0 && cleaned.length < 100) {
      movies.push(cleaned);
    }
  });

  return movies.slice(0, 20);
}

// Fetch from a single source
async function fetchFromSource(source) {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.error(`${source.name} returned ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const movies = source.parser($);

    return movies.map(movie => ({
      title: movie,
      source: source.name
    }));

  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error.message);
    return [];
  }
}

// Main function to get all movies
async function getAllMovies() {
  try {
    // Fetch from all sources in parallel
    const results = await Promise.all(
      sources.map(source => fetchFromSource(source))
    );

    // Flatten and combine results
    const allMovies = results.flat();

    // Remove duplicates (case-insensitive)
    const uniqueMovies = [];
    const seenTitles = new Set();

    allMovies.forEach(movie => {
      const normalizedTitle = movie.title.toLowerCase().trim();
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueMovies.push(movie);
      }
    });

    // Group by source for summary
    const bySource = {};
    uniqueMovies.forEach(movie => {
      if (!bySource[movie.source]) {
        bySource[movie.source] = [];
      }
      bySource[movie.source].push(movie.title);
    });

    return {
      success: true,
      totalMovies: uniqueMovies.length,
      sources: Object.keys(bySource).map(source => ({
        name: source,
        count: bySource[source].length
      })),
      movies: uniqueMovies,
      bySource: bySource,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error getting all movies:', error);
    return {
      success: false,
      error: error.message,
      movies: []
    };
  }
}

module.exports = { getAllMovies };
