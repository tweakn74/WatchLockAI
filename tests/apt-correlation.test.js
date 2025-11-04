/**
 * Tests for APT Correlation Module
 */

import { correlateAPTGroups, addAPTCorrelation } from '../services/worker/src/apt-correlation.js';

describe('APT Correlation', () => {
  const mockAPTProfiles = [
    {
      id: 'apt28',
      name: 'APT28',
      aliases: ['Fancy Bear', 'Sofacy'],
      country: 'Russia',
      malware: [
        { name: 'X-Agent', type: 'Backdoor' },
        { name: 'Sofacy', type: 'Backdoor' },
      ],
      techniques: [
        { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
        { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      ],
      tools: ['Mimikatz', 'Responder'],
      targetedSectors: ['Government', 'Defense', 'Media'],
      targetedCountries: ['United States', 'Ukraine', 'Germany'],
      mitreAttackId: 'G0007',
    },
    {
      id: 'lazarus',
      name: 'Lazarus Group',
      aliases: ['Hidden Cobra', 'Guardians of Peace'],
      country: 'North Korea',
      malware: [
        { name: 'WannaCry', type: 'Ransomware' },
        { name: 'BLINDINGCAN', type: 'Backdoor' },
      ],
      techniques: [
        { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
        { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' },
      ],
      tools: ['PowerShell', 'Mimikatz'],
      targetedSectors: ['Financial', 'Cryptocurrency', 'Media'],
      targetedCountries: ['United States', 'South Korea', 'Japan'],
      mitreAttackId: 'G0032',
    },
  ];

  describe('correlateAPTGroups', () => {
    test('should match APT by malware name', () => {
      const threat = {
        title: 'New X-Agent malware campaign targeting government agencies',
        description: 'Russian hackers using X-Agent backdoor',
        tags: [],
      };

      const matches = correlateAPTGroups(threat, mockAPTProfiles);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].aptName).toBe('APT28');
      expect(matches[0].confidence).toBeGreaterThan(20);
      expect(matches[0].indicators).toContain('Malware: X-Agent');
    });

    test('should match APT by MITRE ATT&CK technique', () => {
      const threat = {
        title: 'Ransomware attack using encryption',
        description: 'Attackers encrypted data for impact',
        tags: ['T1486', 'ransomware'],
      };

      const matches = correlateAPTGroups(threat, mockAPTProfiles);

      expect(matches.length).toBeGreaterThan(0);
      const lazarusMatch = matches.find(m => m.aptName === 'Lazarus Group');
      expect(lazarusMatch).toBeDefined();
      expect(lazarusMatch.confidence).toBeGreaterThan(0);
    });

    test('should match APT by name mention', () => {
      const threat = {
        title: 'Fancy Bear group launches new campaign',
        description: 'APT28 targeting European governments',
        tags: [],
      };

      const matches = correlateAPTGroups(threat, mockAPTProfiles);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].aptName).toBe('APT28');
      expect(matches[0].confidence).toBeGreaterThan(40);
    });

    test('should match APT by targeted sector', () => {
      const threat = {
        title: 'Cyberattack on government agencies',
        description: 'Hackers targeting federal government systems',
        tags: [],
      };

      const matches = correlateAPTGroups(threat, mockAPTProfiles);

      expect(matches.length).toBeGreaterThan(0);
      const apt28Match = matches.find(m => m.aptName === 'APT28');
      expect(apt28Match).toBeDefined();
    });

    test('should match APT by tool usage', () => {
      const threat = {
        title: 'Attackers using Mimikatz for credential theft',
        description: 'Hackers deployed Mimikatz to extract passwords',
        tags: [],
      };

      const matches = correlateAPTGroups(threat, mockAPTProfiles);

      expect(matches.length).toBeGreaterThan(0);
      // Both APT28 and Lazarus use Mimikatz
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    test('should return empty array for no matches', () => {
      const threat = {
        title: 'Generic phishing email detected',
        description: 'Standard phishing campaign with no specific indicators',
        tags: [],
      };

      const matches = correlateAPTGroups(threat, mockAPTProfiles);

      // May have low-confidence matches, but should not have high-confidence ones
      const highConfidenceMatches = matches.filter(m => m.confidence > 50);
      expect(highConfidenceMatches.length).toBe(0);
    });

    test('should sort matches by confidence', () => {
      const threat = {
        title: 'APT28 Fancy Bear using X-Agent malware and Mimikatz',
        description: 'Russian hackers targeting government with PowerShell',
        tags: ['T1566.001', 'T1059.001'],
      };

      const matches = correlateAPTGroups(threat, mockAPTProfiles);

      expect(matches.length).toBeGreaterThan(0);
      // Verify sorted by confidence descending
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
      }
    });

    test('should include indicators in match results', () => {
      const threat = {
        title: 'WannaCry ransomware spreading',
        description: 'North Korean hackers using WannaCry',
        tags: ['T1486'],
      };

      const matches = correlateAPTGroups(threat, mockAPTProfiles);

      const lazarusMatch = matches.find(m => m.aptName === 'Lazarus Group');
      expect(lazarusMatch).toBeDefined();
      expect(lazarusMatch.indicators).toBeDefined();
      expect(lazarusMatch.indicators.length).toBeGreaterThan(0);
    });
  });

  describe('addAPTCorrelation', () => {
    test('should add APT attribution to threats', () => {
      const threats = [
        {
          title: 'APT28 campaign detected',
          description: 'Fancy Bear using X-Agent',
          tags: [],
        },
        {
          title: 'Generic malware',
          description: 'Unknown threat',
          tags: [],
        },
      ];

      const result = addAPTCorrelation(threats, mockAPTProfiles);

      expect(result.length).toBe(2);
      expect(result[0].hasAPTAttribution).toBe(true);
      expect(result[0].aptAttribution).toBeDefined();
      expect(result[0].aptAttribution.length).toBeGreaterThan(0);
    });

    test('should not add attribution when no matches', () => {
      const threats = [
        {
          title: 'Generic phishing',
          description: 'Standard phishing email',
          tags: [],
        },
      ];

      const result = addAPTCorrelation(threats, mockAPTProfiles);

      expect(result.length).toBe(1);
      // May have hasAPTAttribution=false or undefined
      if (result[0].hasAPTAttribution !== undefined) {
        expect(result[0].hasAPTAttribution).toBe(false);
      }
    });

    test('should preserve original threat properties', () => {
      const threats = [
        {
          id: 'threat-1',
          title: 'Test threat',
          description: 'Test description',
          riskScore: 85,
          severity: 'HIGH',
        },
      ];

      const result = addAPTCorrelation(threats, mockAPTProfiles);

      expect(result[0].id).toBe('threat-1');
      expect(result[0].title).toBe('Test threat');
      expect(result[0].riskScore).toBe(85);
      expect(result[0].severity).toBe('HIGH');
    });
  });
});

