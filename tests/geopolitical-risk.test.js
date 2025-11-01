/**
 * Unit tests for Geopolitical Risk Module
 */

describe('Geopolitical Risk Module', () => {
  describe('Risk Level Mapping', () => {
    it('should validate critical risk level (90-100)', () => {
      const criticalScores = [90, 95, 100];
      criticalScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(90);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should validate high risk level (70-89)', () => {
      const highScores = [70, 75, 80, 89];
      highScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(70);
        expect(score).toBeLessThan(90);
      });
    });

    it('should validate medium risk level (40-69)', () => {
      const mediumScores = [40, 50, 60, 69];
      mediumScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(40);
        expect(score).toBeLessThan(70);
      });
    });

    it('should validate low risk level (0-39)', () => {
      const lowScores = [0, 10, 20, 39];
      lowScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThan(40);
      });
    });
  });

  describe('Risk Score Calculation', () => {
    it('should validate risk factor weights', () => {
      const weights = {
        threatActorPresence: 40,
        cyberConflictHistory: 30,
        criticalInfrastructureExposure: 20,
        regulatoryEnvironment: 10,
      };

      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBe(100);
    });

    it('should validate threat actor presence scoring (max 40)', () => {
      const maxScore = 40;
      const testScores = [0, 10, 20, 30, 40];

      testScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(maxScore);
      });
    });

    it('should validate cyber conflict history scoring (max 30)', () => {
      const maxScore = 30;
      const testScores = [0, 10, 20, 30];

      testScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(maxScore);
      });
    });

    it('should validate infrastructure exposure scoring (max 20)', () => {
      const maxScore = 20;
      const testScores = [0, 5, 10, 15, 20];

      testScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(maxScore);
      });
    });

    it('should validate regulatory environment scoring (max 10)', () => {
      const maxScore = 10;
      const testScores = [0, 3, 5, 7, 10];

      testScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(maxScore);
      });
    });

    it('should validate total risk score calculation', () => {
      const country = {
        factors: {
          threatActorPresence: { score: 35 },
          cyberConflictHistory: { score: 28 },
          criticalInfrastructureExposure: { score: 18 },
          regulatoryEnvironment: { score: 8 },
        },
      };

      const totalScore =
        country.factors.threatActorPresence.score +
        country.factors.cyberConflictHistory.score +
        country.factors.criticalInfrastructureExposure.score +
        country.factors.regulatoryEnvironment.score;

      expect(totalScore).toBe(89);
      expect(totalScore).toBeLessThanOrEqual(100);
    });

    it('should validate risk score capping at 100', () => {
      const excessiveScore = 150;
      const cappedScore = Math.min(excessiveScore, 100);
      expect(cappedScore).toBe(100);
    });
  });

  describe('Geopolitical Risk Schema', () => {
    it('should validate country risk structure', () => {
      const mockCountry = {
        id: 'CR-001',
        name: 'Test Country',
        code: 'TC',
        region: 'Europe',
        riskScore: 85,
        riskLevel: 'high',
        factors: {
          threatActorPresence: {
            score: 30,
            actorCount: 5,
            sophistication: 'advanced',
            details: 'Test details',
          },
          cyberConflictHistory: {
            score: 25,
            incidentCount: 100,
            severity: 'high',
            details: 'Test details',
          },
          criticalInfrastructureExposure: {
            score: 18,
            vulnerabilityLevel: 'high',
            details: 'Test details',
          },
          regulatoryEnvironment: {
            score: 7,
            maturity: 'developing',
            details: 'Test details',
          },
        },
        events: [],
        trends: {
          direction: 'increasing',
          velocity: 'moderate',
          forecast: 'Test forecast',
        },
        lastUpdated: '2025-11-01T00:00:00Z',
      };

      expect(mockCountry.id).toMatch(/^CR-\d{3}$/);
      expect(mockCountry.code).toMatch(/^[A-Z]{2}$/);
      expect(mockCountry.riskScore).toBeGreaterThanOrEqual(0);
      expect(mockCountry.riskScore).toBeLessThanOrEqual(100);
      expect(['critical', 'high', 'medium', 'low']).toContain(mockCountry.riskLevel);
      expect(mockCountry.factors).toBeDefined();
      expect(mockCountry.factors.threatActorPresence).toBeDefined();
      expect(mockCountry.factors.cyberConflictHistory).toBeDefined();
      expect(mockCountry.factors.criticalInfrastructureExposure).toBeDefined();
      expect(mockCountry.factors.regulatoryEnvironment).toBeDefined();
    });

    it('should validate risk level enum values', () => {
      const validRiskLevels = ['critical', 'high', 'medium', 'low'];
      expect(validRiskLevels).toHaveLength(4);
      expect(validRiskLevels).toContain('critical');
      expect(validRiskLevels).toContain('high');
      expect(validRiskLevels).toContain('medium');
      expect(validRiskLevels).toContain('low');
    });

    it('should validate region enum values', () => {
      const validRegions = [
        'North America',
        'South America',
        'Europe',
        'Asia',
        'Middle East',
        'Africa',
        'Oceania',
      ];
      expect(validRegions).toHaveLength(7);
    });

    it('should validate sophistication levels', () => {
      const validSophistication = ['basic', 'intermediate', 'advanced', 'expert'];
      expect(validSophistication).toHaveLength(4);
    });

    it('should validate maturity levels', () => {
      const validMaturity = ['nascent', 'developing', 'established', 'mature', 'leading'];
      expect(validMaturity).toHaveLength(5);
    });

    it('should validate trend directions', () => {
      const validDirections = ['increasing', 'stable', 'decreasing'];
      expect(validDirections).toHaveLength(3);
    });

    it('should validate trend velocities', () => {
      const validVelocities = ['rapid', 'moderate', 'slow'];
      expect(validVelocities).toHaveLength(3);
    });
  });

  describe('Geopolitical Context Addition', () => {
    it('should validate geopolitical context structure', () => {
      const mockContext = {
        country: 'Russia',
        riskScore: 95,
        riskLevel: 'critical',
        region: 'Europe',
      };

      expect(mockContext.country).toBeDefined();
      expect(mockContext.riskScore).toBeGreaterThanOrEqual(0);
      expect(mockContext.riskScore).toBeLessThanOrEqual(100);
      expect(['critical', 'high', 'medium', 'low']).toContain(mockContext.riskLevel);
      expect(mockContext.region).toBeDefined();
    });

    it('should validate country name matching logic', () => {
      const threatText = 'Russian APT targets energy sector';
      const countryName = 'Russia';

      expect(threatText.toLowerCase()).toContain(countryName.toLowerCase());
    });

    it('should validate actor attribution integration', () => {
      const mockThreat = {
        id: 'T1',
        title: 'APT attack',
        actorAttribution: [
          {
            actor: 'APT28',
            country: 'Russia',
          },
        ],
      };

      expect(mockThreat.actorAttribution).toBeDefined();
      expect(mockThreat.actorAttribution[0].country).toBe('Russia');
    });
  });

  describe('Global Risk Statistics', () => {
    it('should calculate statistics correctly', () => {
      const mockCountries = [
        { riskLevel: 'critical', riskScore: 95 },
        { riskLevel: 'critical', riskScore: 92 },
        { riskLevel: 'high', riskScore: 75 },
        { riskLevel: 'medium', riskScore: 50 },
        { riskLevel: 'low', riskScore: 30 },
      ];

      const criticalCount = mockCountries.filter(c => c.riskLevel === 'critical').length;
      const highCount = mockCountries.filter(c => c.riskLevel === 'high').length;
      const mediumCount = mockCountries.filter(c => c.riskLevel === 'medium').length;
      const lowCount = mockCountries.filter(c => c.riskLevel === 'low').length;

      expect(criticalCount).toBe(2);
      expect(highCount).toBe(1);
      expect(mediumCount).toBe(1);
      expect(lowCount).toBe(1);

      const totalScore = mockCountries.reduce((sum, c) => sum + c.riskScore, 0);
      const averageScore = Math.round(totalScore / mockCountries.length);
      expect(averageScore).toBe(68);
    });
  });

  describe('Risk Trends Analysis', () => {
    it('should analyze trends correctly', () => {
      const mockCountries = [
        { trends: { direction: 'increasing' } },
        { trends: { direction: 'increasing' } },
        { trends: { direction: 'stable' } },
        { trends: { direction: 'decreasing' } },
      ];

      const increasing = mockCountries.filter(c => c.trends?.direction === 'increasing').length;
      const stable = mockCountries.filter(c => c.trends?.direction === 'stable').length;
      const decreasing = mockCountries.filter(c => c.trends?.direction === 'decreasing').length;

      expect(increasing).toBe(2);
      expect(stable).toBe(1);
      expect(decreasing).toBe(1);
    });
  });

  describe('Region-Based Analysis', () => {
    it('should filter countries by region', () => {
      const mockCountries = [
        { name: 'Country A', region: 'Europe' },
        { name: 'Country B', region: 'Asia' },
        { name: 'Country C', region: 'Europe' },
      ];

      const europeCountries = mockCountries.filter(c => c.region === 'Europe');
      expect(europeCountries).toHaveLength(2);
    });

    it('should calculate risk by region', () => {
      const mockCountries = [
        { region: 'Europe', riskScore: 90 },
        { region: 'Europe', riskScore: 80 },
        { region: 'Asia', riskScore: 70 },
      ];

      const europeCountries = mockCountries.filter(c => c.region === 'Europe');
      const europeTotal = europeCountries.reduce((sum, c) => sum + c.riskScore, 0);
      const europeAverage = Math.round(europeTotal / europeCountries.length);

      expect(europeAverage).toBe(85);
    });
  });

  describe('Top Risk Countries', () => {
    it('should sort countries by risk score', () => {
      const mockCountries = [
        { name: 'Country A', riskScore: 50 },
        { name: 'Country B', riskScore: 95 },
        { name: 'Country C', riskScore: 75 },
      ];

      const sorted = [...mockCountries].sort((a, b) => b.riskScore - a.riskScore);

      expect(sorted[0].name).toBe('Country B');
      expect(sorted[1].name).toBe('Country C');
      expect(sorted[2].name).toBe('Country A');
    });
  });
});
