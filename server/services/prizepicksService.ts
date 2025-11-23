// Added proper PrizePicks league mapping
const PRIZEPICKS_LEAGUE_MAP: Record<string, number> = {
  NBA: 7,
  NFL: 9,
  NHL: 3,
};

export class PrizePicksService {
  async fetchProjections(sport: string) {
    const leagueId = PRIZEPICKS_LEAGUE_MAP[sport];
    if (!leagueId) {
      console.error(`[PRIZEPICKS] ❌ Invalid sport mapping for ${sport}`);
      return null;
    }

    const url = `/projections?league_id=${leagueId}&per_page=500&single_stat=true&types[]=all`;

    return await this.apiFetch(url);
  }

  private async apiFetch(url: string): Promise<any> {
    // This method should be implemented to use the prizePicksClient
    // For now, this is a placeholder that matches the patch structure
    throw new Error("apiFetch not implemented - use prizePicksClient directly");
  }
}

