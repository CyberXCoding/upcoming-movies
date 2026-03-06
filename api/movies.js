const cheerio = require('cheerio');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Fetch the Sacnilk upcoming movies page
    const targetUrl = 'https://sacnilk.com/entertainmenttopbar/Upcoming_Movies';
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Array to store upcoming movies
    const upcomingMovies = [];
    let isUpcomingSection = false;

    // Find all h1, h3 elements and extract movie names
    $('h1, h3').each((index, element) => {
      const text = $(element).text().trim();
      
      // Check if we've reached the upcoming movies section
      if (text.includes('🎬 Upcoming Movies') || text.includes('Upcoming Movies')) {
        isUpcomingSection = true;
        return; // Skip this header
      }

      // If we're in the upcoming section and it's an h3 (movie title)
      if (isUpcomingSection && $(element).is('h3')) {
        // Filter out navigation/footer items
        if (
          text && 
          text.length > 0 &&
          !text.includes('Sacnilk') &&
          !text.includes('Quick Links') &&
          !text.includes('Industries') &&
          !text.includes('Support') &&
          !text.includes('Enjoying our content')
        ) {
          upcomingMovies.push(text);
        }
      }
    });

    // Return clean JSON with movie names
    return res.status(200).json({
      success: true,
      count: upcomingMovies.length,
      movies: upcomingMovies,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error scraping movies:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      movies: []
    });
  }
};
