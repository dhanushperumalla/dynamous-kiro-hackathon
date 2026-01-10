import { CareerDomain } from '@/models/CareerDomain';
import {
  ICareerDomain,
  ICareerDomainDocument,
  DomainCategory,
  DifficultyLevel,
  IDomainSearchQuery,
  DomainSortBy
} from '@/types/recommendation';
import { logger } from '@/utils/logger';
import { sampleCareerDomains } from '@/data/sampleDomains';

export class CareerDomainService {
  /**
   * Initialize the database with sample career domains
   */
  static async seedDomains(): Promise<void> {
    try {
      const existingCount = await CareerDomain.countDocuments();
      
      if (existingCount === 0) {
        logger.info('Seeding career domains database with sample data');
        
        for (const domainData of sampleCareerDomains) {
          await CareerDomain.create(domainData);
        }
        
        logger.info(`Successfully seeded ${sampleCareerDomains.length} career domains`);
      } else {
        logger.info(`Database already contains ${existingCount} career domains, skipping seed`);
      }
    } catch (error) {
      logger.error('Error seeding career domains', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a new career domain
   */
  static async createDomain(domainData: Omit<ICareerDomain, 'id' | 'createdAt' | 'updatedAt'>): Promise<ICareerDomainDocument> {
    try {
      logger.info('Creating new career domain', { name: domainData.name });
      
      const domain = await CareerDomain.create(domainData);
      
      logger.info('Career domain created successfully', {
        domainId: domain._id,
        name: domain.name,
        category: domain.category
      });
      
      return domain;
    } catch (error) {
      logger.error('Error creating career domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainName: domainData.name
      });
      throw error;
    }
  }

  /**
   * Get all active career domains
   */
  static async getAllDomains(activeOnly: boolean = true): Promise<ICareerDomainDocument[]> {
    try {
      const query = activeOnly ? { isActive: true } : {};
      const domains = await CareerDomain.find(query).sort({ name: 1 });
      
      logger.debug('Retrieved career domains', {
        count: domains.length,
        activeOnly
      });
      
      return domains;
    } catch (error) {
      logger.error('Error retrieving career domains', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get a career domain by ID
   */
  static async getDomainById(domainId: string): Promise<ICareerDomainDocument | null> {
    try {
      const domain = await CareerDomain.findById(domainId).populate('relatedDomains');
      
      if (!domain) {
        logger.warn('Career domain not found', { domainId });
        return null;
      }
      
      logger.debug('Retrieved career domain by ID', {
        domainId,
        name: domain.name,
        category: domain.category
      });
      
      return domain;
    } catch (error) {
      logger.error('Error retrieving career domain by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId
      });
      throw error;
    }
  }

  /**
   * Get a career domain by name
   */
  static async getDomainByName(name: string): Promise<ICareerDomainDocument | null> {
    try {
      const domain = await CareerDomain.findOne({ name: name.toLowerCase(), isActive: true });
      
      if (!domain) {
        logger.warn('Career domain not found by name', { name });
        return null;
      }
      
      logger.debug('Retrieved career domain by name', {
        name,
        domainId: domain._id,
        category: domain.category
      });
      
      return domain;
    } catch (error) {
      logger.error('Error retrieving career domain by name', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name
      });
      throw error;
    }
  }

  /**
   * Search and filter career domains
   */
  static async searchDomains(searchQuery: IDomainSearchQuery): Promise<{
    domains: ICareerDomainDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        query,
        category,
        difficulty,
        minSalary,
        maxSalary,
        skills,
        tags,
        sortBy = DomainSortBy.NAME,
        sortOrder = 'asc',
        limit = 20,
        offset = 0
      } = searchQuery;

      // Build MongoDB query
      const mongoQuery: any = { isActive: true };

      // Text search
      if (query) {
        mongoQuery.$text = { $search: query };
      }

      // Category filter
      if (category) {
        mongoQuery.category = category;
      }

      // Difficulty filter
      if (difficulty) {
        mongoQuery.difficulty = difficulty;
      }

      // Salary range filter
      if (minSalary || maxSalary) {
        mongoQuery['marketData.averageSalaryRange.median'] = {};
        if (minSalary) {
          mongoQuery['marketData.averageSalaryRange.median'].$gte = minSalary;
        }
        if (maxSalary) {
          mongoQuery['marketData.averageSalaryRange.median'].$lte = maxSalary;
        }
      }

      // Skills filter
      if (skills && skills.length > 0) {
        mongoQuery.$or = [
          { 'requiredSkills.name': { $in: skills } },
          { 'optionalSkills.name': { $in: skills } }
        ];
      }

      // Tags filter
      if (tags && tags.length > 0) {
        mongoQuery.tags = { $in: tags };
      }

      // Build sort criteria
      const sortCriteria: any = {};
      switch (sortBy) {
        case DomainSortBy.NAME:
          sortCriteria.name = sortOrder === 'asc' ? 1 : -1;
          break;
        case DomainSortBy.DEMAND_SCORE:
          sortCriteria['marketData.demandScore'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case DomainSortBy.SALARY:
          sortCriteria['marketData.averageSalaryRange.median'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case DomainSortBy.GROWTH_RATE:
          sortCriteria['marketData.jobGrowthRate'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case DomainSortBy.DIFFICULTY:
          sortCriteria.difficulty = sortOrder === 'asc' ? 1 : -1;
          break;
        case DomainSortBy.TIME_TO_MASTERY:
          sortCriteria.timeToMastery = sortOrder === 'asc' ? 1 : -1;
          break;
        case DomainSortBy.CREATED_AT:
          sortCriteria.createdAt = sortOrder === 'asc' ? 1 : -1;
          break;
        default:
          sortCriteria.name = 1;
      }

      // Add text score sorting if text search is used
      if (query) {
        sortCriteria.score = { $meta: 'textScore' };
      }

      // Execute query with pagination
      const [domains, total] = await Promise.all([
        CareerDomain.find(mongoQuery)
          .sort(sortCriteria)
          .skip(offset)
          .limit(limit)
          .exec(),
        CareerDomain.countDocuments(mongoQuery)
      ]);

      const page = Math.floor(offset / limit) + 1;

      logger.debug('Career domain search completed', {
        query: searchQuery,
        resultsCount: domains.length,
        totalCount: total,
        page,
        limit
      });

      return {
        domains,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error searching career domains', {
        error: error instanceof Error ? error.message : 'Unknown error',
        searchQuery
      });
      throw error;
    }
  }

  /**
   * Get domains by category
   */
  static async getDomainsByCategory(category: DomainCategory, activeOnly: boolean = true): Promise<ICareerDomainDocument[]> {
    try {
      const domains = await CareerDomain.findByCategory(category, activeOnly);
      
      logger.debug('Retrieved domains by category', {
        category,
        count: domains.length,
        activeOnly
      });
      
      return domains;
    } catch (error) {
      logger.error('Error retrieving domains by category', {
        error: error instanceof Error ? error.message : 'Unknown error',
        category
      });
      throw error;
    }
  }

  /**
   * Get domains by difficulty level
   */
  static async getDomainsByDifficulty(difficulty: DifficultyLevel, activeOnly: boolean = true): Promise<ICareerDomainDocument[]> {
    try {
      const domains = await CareerDomain.findByDifficulty(difficulty, activeOnly);
      
      logger.debug('Retrieved domains by difficulty', {
        difficulty,
        count: domains.length,
        activeOnly
      });
      
      return domains;
    } catch (error) {
      logger.error('Error retrieving domains by difficulty', {
        error: error instanceof Error ? error.message : 'Unknown error',
        difficulty
      });
      throw error;
    }
  }

  /**
   * Get top demand domains
   */
  static async getTopDemandDomains(limit: number = 10): Promise<ICareerDomainDocument[]> {
    try {
      const domains = await CareerDomain.getTopDemandDomains(limit);
      
      logger.debug('Retrieved top demand domains', {
        count: domains.length,
        limit
      });
      
      return domains;
    } catch (error) {
      logger.error('Error retrieving top demand domains', {
        error: error instanceof Error ? error.message : 'Unknown error',
        limit
      });
      throw error;
    }
  }

  /**
   * Get high growth domains
   */
  static async getHighGrowthDomains(limit: number = 10): Promise<ICareerDomainDocument[]> {
    try {
      const domains = await CareerDomain.getHighGrowthDomains(limit);
      
      logger.debug('Retrieved high growth domains', {
        count: domains.length,
        limit
      });
      
      return domains;
    } catch (error) {
      logger.error('Error retrieving high growth domains', {
        error: error instanceof Error ? error.message : 'Unknown error',
        limit
      });
      throw error;
    }
  }

  /**
   * Get related domains for a given domain
   */
  static async getRelatedDomains(domainId: string): Promise<ICareerDomainDocument[]> {
    try {
      const domain = await CareerDomain.findById(domainId).populate('relatedDomains');
      
      if (!domain) {
        logger.warn('Domain not found for related domains lookup', { domainId });
        return [];
      }
      
      // Type assertion with proper handling of populated vs non-populated state
      const relatedDomains = (domain.relatedDomains as unknown) as ICareerDomainDocument[];
      
      // Ensure we actually have populated documents, not just ObjectIds
      const populatedDomains = relatedDomains.filter(
        (relatedDomain): relatedDomain is ICareerDomainDocument => 
          relatedDomain && typeof relatedDomain === 'object' && 'name' in relatedDomain
      );
      
      logger.debug('Retrieved related domains', {
        domainId,
        relatedCount: populatedDomains.length
      });
      
      return populatedDomains;
    } catch (error) {
      logger.error('Error retrieving related domains', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId
      });
      throw error;
    }
  }

  /**
   * Update a career domain
   */
  static async updateDomain(
    domainId: string,
    updateData: Partial<Omit<ICareerDomain, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ICareerDomainDocument | null> {
    try {
      const domain = await CareerDomain.findByIdAndUpdate(
        domainId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!domain) {
        logger.warn('Domain not found for update', { domainId });
        return null;
      }
      
      logger.info('Career domain updated successfully', {
        domainId,
        name: domain.name,
        updatedFields: Object.keys(updateData)
      });
      
      return domain;
    } catch (error) {
      logger.error('Error updating career domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId,
        updateData
      });
      throw error;
    }
  }

  /**
   * Deactivate a career domain (soft delete)
   */
  static async deactivateDomain(domainId: string): Promise<boolean> {
    try {
      const domain = await CareerDomain.findByIdAndUpdate(
        domainId,
        { isActive: false },
        { new: true }
      );
      
      if (!domain) {
        logger.warn('Domain not found for deactivation', { domainId });
        return false;
      }
      
      logger.info('Career domain deactivated', {
        domainId,
        name: domain.name
      });
      
      return true;
    } catch (error) {
      logger.error('Error deactivating career domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId
      });
      throw error;
    }
  }

  /**
   * Get domain statistics
   */
  static async getDomainStatistics(): Promise<{
    totalDomains: number;
    averageDemandScore: number;
    averageGrowthRate: number;
    averageTimeToMastery: number;
    categoryDistribution: Record<string, number>;
    difficultyDistribution: Record<string, number>;
  }> {
    try {
      const stats = await CareerDomain.getDomainStatistics();
      
      logger.debug('Retrieved domain statistics', stats);
      
      return stats;
    } catch (error) {
      logger.error('Error retrieving domain statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get domains by tags
   */
  static async getDomainsByTags(tags: string[], activeOnly: boolean = true): Promise<ICareerDomainDocument[]> {
    try {
      const domains = await CareerDomain.findByTags(tags, activeOnly);
      
      logger.debug('Retrieved domains by tags', {
        tags,
        count: domains.length,
        activeOnly
      });
      
      return domains;
    } catch (error) {
      logger.error('Error retrieving domains by tags', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tags
      });
      throw error;
    }
  }

  /**
   * Calculate market score for a domain
   */
  static calculateMarketScore(domain: ICareerDomainDocument): number {
    try {
      // Use type assertion to access the Mongoose instance method
      const marketScore = (domain as any).calculateMarketScore();
      
      logger.debug('Calculated market score for domain', {
        domainId: domain._id,
        name: domain.name,
        marketScore
      });
      
      return marketScore;
    } catch (error) {
      logger.error('Error calculating market score', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId: domain._id
      });
      throw error;
    }
  }

  /**
   * Get domains suitable for a specific experience level
   */
  static async getDomainsForExperienceLevel(experienceLevel: string): Promise<ICareerDomainDocument[]> {
    try {
      const domains = await CareerDomain.find({
        isActive: true,
        'careerPaths.experienceLevel': experienceLevel
      });
      
      logger.debug('Retrieved domains for experience level', {
        experienceLevel,
        count: domains.length
      });
      
      return domains;
    } catch (error) {
      logger.error('Error retrieving domains for experience level', {
        error: error instanceof Error ? error.message : 'Unknown error',
        experienceLevel
      });
      throw error;
    }
  }

  /**
   * Get multiple domains by their IDs
   */
  static async getDomainsByIds(domainIds: string[]): Promise<ICareerDomainDocument[]> {
    try {
      const domains = await CareerDomain.find({
        _id: { $in: domainIds },
        isActive: true
      });
      
      logger.debug('Retrieved domains by IDs', {
        requestedIds: domainIds,
        foundCount: domains.length
      });
      
      return domains;
    } catch (error) {
      logger.error('Error retrieving domains by IDs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainIds
      });
      throw error;
    }
  }

  /**
   * Get domains within a salary range
   */
  static async getDomainsInSalaryRange(minSalary: number, maxSalary: number): Promise<ICareerDomainDocument[]> {
    try {
      const domains = await CareerDomain.find({
        isActive: true,
        'marketData.averageSalaryRange.median': {
          $gte: minSalary,
          $lte: maxSalary
        }
      });
      
      logger.debug('Retrieved domains in salary range', {
        minSalary,
        maxSalary,
        count: domains.length
      });
      
      return domains;
    } catch (error) {
      logger.error('Error retrieving domains in salary range', {
        error: error instanceof Error ? error.message : 'Unknown error',
        minSalary,
        maxSalary
      });
      throw error;
    }
  }
}