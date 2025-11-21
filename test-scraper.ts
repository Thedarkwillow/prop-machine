import { prizepicksScraperClient } from "./server/integrations/prizepicksScraperClient";
import { underdogScraperClient } from "./server/integrations/underdogScraperClient";

async function testScrapers() {
  console.log('=== Testing PrizePicks Scraper ===\n');
  
  try {
    const ppResponse = await prizepicksScraperClient.getProjections(7); // NBA = 7
    console.log(`\nPrizePicks Result: ${ppResponse.data.length} projections found`);
    
    if (ppResponse.data.length > 0) {
      console.log('\nSample PrizePicks projection:');
      console.log(JSON.stringify(ppResponse.data[0], null, 2));
      
      const normalized = prizepicksScraperClient.normalizeToProps(ppResponse, 'NBA');
      console.log(`\nNormalized to ${normalized.length} props`);
      console.log('Sample normalized prop:');
      console.log(JSON.stringify(normalized[0], null, 2));
    }
  } catch (error) {
    console.error('PrizePicks error:', error);
  } finally {
    await prizepicksScraperClient.close();
  }
  
  console.log('\n\n=== Testing Underdog Scraper ===\n');
  
  try {
    const udResponse = await underdogScraperClient.getAppearances('NBA');
    console.log(`\nUnderdog Result: ${udResponse.appearances.length} appearances found`);
    
    if (udResponse.appearances.length > 0) {
      console.log('\nSample Underdog appearance:');
      console.log(JSON.stringify(udResponse.appearances[0], null, 2));
      
      const normalized = underdogScraperClient.normalizeToProps(udResponse, 'NBA');
      console.log(`\nNormalized to ${normalized.length} props`);
      console.log('Sample normalized prop:');
      console.log(JSON.stringify(normalized[0], null, 2));
    }
  } catch (error) {
    console.error('Underdog error:', error);
  } finally {
    await underdogScraperClient.close();
  }
  
  process.exit(0);
}

testScrapers();
