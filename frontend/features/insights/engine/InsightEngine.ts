import { InsightEngineContext, InsightResult, InsightGenerator } from '../types/insight.types';
import { prioritizeInsights } from '../scoring/prioritization';

export class InsightEngine {
  private generators: InsightGenerator[] = [];

  constructor(generators: InsightGenerator[] = []) {
    this.generators = generators;
  }

  public registerGenerator(generator: InsightGenerator) {
    this.generators.push(generator);
  }

  /**
   * Evaluates all registered generators and returns a prioritized list of insights.
   */
  public generateInsights(context: InsightEngineContext): InsightResult[] {
    let allInsights: InsightResult[] = [];

    for (const generator of this.generators) {
      try {
        const insights = generator(context);
        allInsights = allInsights.concat(insights);
      } catch (error) {
        console.error('Error running insight generator:', error);
      }
    }

    return prioritizeInsights(allInsights);
  }

  /**
   * Helper to fetch just the single most important insight.
   */
  public getPrimaryInsight(context: InsightEngineContext): InsightResult | null {
    const prioritized = this.generateInsights(context);
    return prioritized.length > 0 ? prioritized[0] : null;
  }
}
