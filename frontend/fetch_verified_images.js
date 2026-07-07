const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getWikipediaImage(schoolName) {
  try {
    // Clean up school name for better searching
    const searchQuery = encodeURIComponent(schoolName.replace('Senior High/Tech', 'Senior High Technical School'));
    
    // 1. Search for the Wikipedia page
    const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${searchQuery}%20Ghana`);
    const searchData = await searchRes.json();
    const searchResults = searchData.query?.search;
    
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    // Assume the top result is the correct school if the title loosely matches
    const topResult = searchResults[0];
    const pageTitle = topResult.title;
    
    // Ensure the result is actually a school in Ghana (basic heuristic)
    if (!topResult.snippet.toLowerCase().includes('school') && !topResult.snippet.toLowerCase().includes('college') && !pageTitle.toLowerCase().includes('school') && !pageTitle.toLowerCase().includes('college')) {
       return null;
    }

    // 2. Fetch the page image (original size)
    const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(pageTitle)}`);
    const imgData = await imgRes.json();
    const pages = imgData.query?.pages;
    
    if (!pages) return null;
    
    const pageKeys = Object.keys(pages);
    const pageData = pages[pageKeys[0]];
    
    if (pageData.original && pageData.original.source) {
      return pageData.original.source;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching Wikipedia data for ${schoolName}:`, error.message);
    return null;
  }
}

async function run() {
  console.log('Fetching schools from Supabase...');
  const { data: schools, error } = await supabase.from('schools').select('id, name');
  
  if (error) {
    console.error('Error fetching schools:', error);
    return;
  }
  
  console.log(`Found ${schools.length} schools. Starting verification process...`);
  
  let successCount = 0;
  
  for (const school of schools) {
    console.log(`Searching for: ${school.name}...`);
    const imageUrl = await getWikipediaImage(school.name);
    
    if (imageUrl) {
      console.log(`✅ Found image for ${school.name}: ${imageUrl}`);
      // Update Supabase
      const { error: updateError } = await supabase
        .from('schools')
        .update({ cover_image_url: imageUrl }) // Use as cover image
        .eq('id', school.id);
        
      if (updateError) {
        console.error(`❌ Failed to update ${school.name} in DB:`, updateError.message);
      } else {
        successCount++;
      }
    } else {
      console.log(`⏭️ No verified image found for ${school.name}. Relying on dynamic fallback.`);
    }
    
    // Sleep briefly to avoid Wikipedia rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n🎉 Verification complete! Successfully verified and updated images for ${successCount} out of ${schools.length} schools.`);
}

run();
