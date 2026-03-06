const cheerio = require('cheerio');
const fetch = require('node-fetch');

// Multiple sources for upcoming movies
const sources = [
  {
    name: 'Sacnilk',
    url: 'https://sacnilk.com/entertainmenttopbar/Upcoming_Movies',
    parser: parseSacnilk
  },
  {
    name: 'FilmiBeat',
    url: 'https://www.filmibeat.com/bollywood/upcoming-movies.html',
    parser: parseFilmiBeat
  },
  {
    name: 'Koimoi',
    url: 'https://www.koimoi.com/bollywood-news/upcoming-movies/',
    parser: parseKoimoi
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
        !text.includes('Enjoying our content')
      ) {
        movies.push(text);
      }
    }
  });

  return movies;
}

// Parse FilmiBeat
function parseFilmiBeat($) {
  const movies = [];
  
  $('.movietitle a, .movie-title a, h2 a, h3 a').each((index, element) => {
    const text = $(element).text().trim();
    if (text && text.length > 0 && !text.includes('Advertisement')) {
      movies.push(text);
    }
  });

  return movies.slice(0, 20); // Limit to top 20
}

// Parse Koimoi
function parseKoimoi($) {
  const movies = [];
  
  $('h2.entry-title a, h3.entry-title a, .post-title a').each((index, element) => {
    const text = $(element).text().trim();
    // Only movies-related content
    if (text && text.length > 0 && !text.toLowerCase().includes('box office')) {
      movies.push(text);
    }
  });

  return movies.slice(0, 15); // Limit to top 15
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

// Main handler
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    return res.status(200).json({
      success: true,
      totalMovies: uniqueMovies.length,
      sources: Object.keys(bySource).map(source => ({
        name: source,
        count: bySource[source].length
      })),
      movies: uniqueMovies,
      bySource: bySource,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      movies: []
    });
  }
};
