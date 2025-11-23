// Correct Underdog sport ID mapping
const UNDERDOG_SPORT_MAP: Record<string, number> = {
  NBA: 2,
  NFL: 4,
  NHL: 8,
};

export class UnderdogService {
  async fetchProps(sport: string) {
    const sportId = UNDERDOG_SPORT_MAP[sport];
    if (!sportId) {
      console.error(`[UNDERDOG] ❌ Invalid sportId for ${sport}`);
      return null;
    }

    const url = `/appearances?sport_id=${sportId}&status=upcoming&projection_types=all&market_type=daily`;

    return await this.apiFetch(url);
  }

  private async apiFetch(url: string): Promise<any> {
    // This method should be implemented to use the underdogClient
    // For now, this is a placeholder that matches the patch structure
    throw new Error("apiFetch not implemented - use underdogClient directly");
  }
}

