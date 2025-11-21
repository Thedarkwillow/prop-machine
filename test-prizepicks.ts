import { prizePicksClient } from './server/integrations/prizePicksClient';

// Wait utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testPrizePicks() {
  console.log('🧪 Testing PrizePicks API (with delays to avoid rate limiting)...\n');

  // Test most likely NHL league IDs first
  const leagueIds = ['7', '4', '8', '3', '5'];
  
  for (const leagueId of leagueIds) {
    try {
      console.log(`\n🔍 Testing league ID: ${leagueId}`);
      const props = await prizePicksClient.getProjections(leagueId, 10);
      
      if (props.length > 0) {
        const sports = [...new Set(props.map(p => p.sport))];
        const leagues = [...new Set(props.map(p => p.league))];
        const stats = [...new Set(props.map(p => p.stat))];
        
        console.log(`   ✅ Found ${props.length} props`);
        console.log(`   Sports: ${sports.join(', ')}`);
        console.log(`   Leagues: ${leagues.join(', ')}`);
        console.log(`   Sample stats: ${stats.slice(0, 5).join(', ')}`);
        
        // Check for NHL/hockey
        const isHockey = sports.some(s => s.toLowerCase().includes('hockey')) ||
                         leagues.some(l => l.toLowerCase().includes('nhl'));
        
        if (isHockey) {
          console.log(`   🏒 THIS IS NHL! League ID: ${leagueId}`);
          const faceoffs = props.filter(p => p.stat.toLowerCase().includes('faceoff'));
          console.log(`   🎯 Faceoff props: ${faceoffs.length}`);
          if (faceoffs.length > 0) {
            console.log(`   Sample faceoffs:`, faceoffs.slice(0, 3).map(f => 
              `${f.player}: ${f.stat} ${f.line}`
            ));
          }
          break; // Found it, stop testing
        }
      }
      
      // Wait 5 seconds between requests to avoid rate limiting
      console.log('   ⏳ Waiting 5 seconds...');
      await wait(5000);
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.message.includes('429')) {
        console.log('   ⚠️  Rate limited - waiting 15 seconds...');
        await wait(15000);
      } else {
        await wait(5000);
      }
    }
  }
}

testPrizePicks().catch(console.error);
