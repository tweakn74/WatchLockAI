/**
 * Tests for Detection Correlation Module
 */

import { describe, test, expect } from '@jest/globals';
import {
  findRecommendedDetections,
  addDetectionRecommendations,
  getDetectionCoverageStats,
  getTopRecommendedDetections,
} from '../services/worker/src/detection-correlation.js';

// Mock detection catalog
const mockDetections = [
  {
    id: 'DET-0001',
    name: 'PowerShell Empire C2 Detection',
    severity: 'CRITICAL',
    status: 'stable',
    platform: 'Splunk',
    techniques: [
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1071.001', name: 'Web Protocols', tactic: 'Command and Control' },
    ],
  },
  {
    id: 'DET-0002',
    name: 'Mimikatz Credential Dumping',
    severity: 'CRITICAL',
    status: 'stable',
    platform: 'Splunk',
    techniques: [
      { id: 'T1003.001', name: 'LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access' },
    ],
  },
  {
    id: 'DET-0003',
    name: 'Suspicious Scheduled Task',
    severity: 'HIGH',
    status: 'stable',
    platform: 'Splunk',
    techniques: [{ id: 'T1053.005', name: 'Scheduled Task', tactic: 'Persistence' }],
  },
  {
    id: 'DET-0004',
    name: 'Ransomware File Encryption',
    severity: 'CRITICAL',
    status: 'preview',
    platform: 'Splunk',
    techniques: [{ id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' }],
  },
];

describe('Detection Correlation Module', () => {
  describe('findRecommendedDetections', () => {
    test('should find detections matching threat techniques', () => {
      const threat = {
        title: 'PowerShell Empire malware detected',
        description: 'Threat uses T1059.001 for execution',
        tags: ['T1059.001', 'malware'],
      };

      const recommendations = findRecommendedDetections(threat, mockDetections);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].detectionId).toBe('DET-0001');
      expect(recommendations[0].matchedTechniques).toContain('T1059.001');
    });

    test('should return empty array when no techniques match', () => {
      const threat = {
        title: 'Generic phishing email',
        description: 'Standard phishing attempt',
        tags: [],
      };

      const recommendations = findRecommendedDetections(threat, mockDetections);

      expect(recommendations).toEqual([]);
    });

    test('should extract techniques from title and description', () => {
      const threat = {
        title: 'Mimikatz detected using T1003.001',
        description: 'Credential dumping via LSASS memory access',
        tags: [],
      };

      const recommendations = findRecommendedDetections(threat, mockDetections);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].detectionId).toBe('DET-0002');
    });

    test('should calculate match scores correctly', () => {
      const threat = {
        title: 'PowerShell Empire C2 activity',
        description: 'Uses T1059.001 and T1071.001',
        tags: ['T1059.001', 'T1071.001'],
      };

      const recommendations = findRecommendedDetections(threat, mockDetections);

      expect(recommendations[0].matchScore).toBeGreaterThan(0);
      // CRITICAL + stable should have high score
      expect(recommendations[0].matchScore).toBeGreaterThanOrEqual(15);
    });

    test('should calculate coverage percentage', () => {
      const threat = {
        title: 'PowerShell attack',
        description: 'Uses T1059.001',
        tags: ['T1059.001'],
      };

      const recommendations = findRecommendedDetections(threat, mockDetections);

      expect(recommendations[0].coverage).toBe(100); // 1 of 1 techniques matched
    });

    test('should sort by match score', () => {
      const threat = {
        title: 'Multi-technique attack',
        description: 'Uses T1059.001, T1003.001, T1053.005',
        tags: ['T1059.001', 'T1003.001', 'T1053.005'],
      };

      const recommendations = findRecommendedDetections(threat, mockDetections);

      // Should be sorted by score (highest first)
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].matchScore).toBeGreaterThanOrEqual(
          recommendations[i + 1].matchScore
        );
      }
    });

    test('should limit to top 5 recommendations', () => {
      const threat = {
        title: 'Complex attack',
        description: 'Uses T1059.001, T1003.001, T1053.005, T1486',
        tags: ['T1059.001', 'T1003.001', 'T1053.005', 'T1486'],
      };

      const recommendations = findRecommendedDetections(threat, mockDetections);

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    test('should handle threats with mitre field', () => {
      const threat = {
        title: 'Ransomware attack',
        description: 'File encryption detected',
        tags: [],
        mitre: ['T1486'],
      };

      const recommendations = findRecommendedDetections(threat, mockDetections);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].detectionId).toBe('DET-0004');
    });
  });

  describe('addDetectionRecommendations', () => {
    test('should add recommendations to all threats', () => {
      const threats = [
        {
          title: 'PowerShell attack',
          description: 'Uses T1059.001',
          tags: ['T1059.001'],
        },
        {
          title: 'Credential dumping',
          description: 'Uses T1003.001',
          tags: ['T1003.001'],
        },
      ];

      const result = addDetectionRecommendations(threats, mockDetections);

      expect(result.length).toBe(2);
      expect(result[0].recommendedDetections).toBeDefined();
      expect(result[0].detectionCoverage).toBeGreaterThan(0);
      expect(result[1].recommendedDetections).toBeDefined();
      expect(result[1].detectionCoverage).toBeGreaterThan(0);
    });

    test('should handle threats with no matching detections', () => {
      const threats = [
        {
          title: 'Generic threat',
          description: 'No specific techniques',
          tags: [],
        },
      ];

      const result = addDetectionRecommendations(threats, mockDetections);

      expect(result.length).toBe(1);
      expect(result[0].recommendedDetections).toEqual([]);
      expect(result[0].detectionCoverage).toBe(0);
    });

    test('should return original threats if detections array is empty', () => {
      const threats = [
        {
          title: 'Test threat',
          description: 'Test',
          tags: [],
        },
      ];

      const result = addDetectionRecommendations(threats, []);

      expect(result).toEqual(threats);
    });

    test('should handle invalid inputs gracefully', () => {
      expect(addDetectionRecommendations(null, mockDetections)).toBeNull();
      expect(addDetectionRecommendations([], mockDetections)).toEqual([]);
      expect(addDetectionRecommendations([{}], null)).toEqual([{}]);
    });
  });

  describe('getDetectionCoverageStats', () => {
    test('should calculate coverage statistics', () => {
      const threats = [
        {
          title: 'Threat 1',
          severity: 'CRITICAL',
          recommendedDetections: [{ detectionId: 'DET-0001', coverage: 100 }],
          detectionCoverage: 100,
        },
        {
          title: 'Threat 2',
          severity: 'HIGH',
          recommendedDetections: [{ detectionId: 'DET-0002', coverage: 50 }],
          detectionCoverage: 50,
        },
        {
          title: 'Threat 3',
          severity: 'MEDIUM',
          recommendedDetections: [],
          detectionCoverage: 0,
        },
      ];

      const stats = getDetectionCoverageStats(threats);

      expect(stats.totalThreats).toBe(3);
      expect(stats.threatsWithDetections).toBe(2);
      expect(stats.coveragePercentage).toBe(67); // 2/3 = 66.67% rounded to 67
      expect(stats.avgCoverage).toBe(75); // (100 + 50) / 2 = 75
      expect(stats.criticalWithDetections).toBe(1);
      expect(stats.highWithDetections).toBe(1);
    });

    test('should handle empty threats array', () => {
      const stats = getDetectionCoverageStats([]);

      expect(stats.totalThreats).toBe(0);
      expect(stats.threatsWithDetections).toBe(0);
      expect(stats.coveragePercentage).toBe(0);
      expect(stats.avgCoverage).toBe(0);
    });

    test('should handle threats with no detections', () => {
      const threats = [
        {
          title: 'Threat 1',
          severity: 'LOW',
          recommendedDetections: [],
          detectionCoverage: 0,
        },
      ];

      const stats = getDetectionCoverageStats(threats);

      expect(stats.totalThreats).toBe(1);
      expect(stats.threatsWithDetections).toBe(0);
      expect(stats.coveragePercentage).toBe(0);
      expect(stats.avgCoverage).toBe(0);
    });
  });

  describe('getTopRecommendedDetections', () => {
    test('should return most recommended detections', () => {
      const threats = [
        {
          recommendedDetections: [
            { detectionId: 'DET-0001', detectionName: 'Detection 1', severity: 'CRITICAL' },
            { detectionId: 'DET-0002', detectionName: 'Detection 2', severity: 'HIGH' },
          ],
        },
        {
          recommendedDetections: [
            { detectionId: 'DET-0001', detectionName: 'Detection 1', severity: 'CRITICAL' },
          ],
        },
        {
          recommendedDetections: [
            { detectionId: 'DET-0003', detectionName: 'Detection 3', severity: 'MEDIUM' },
          ],
        },
      ];

      const topDetections = getTopRecommendedDetections(threats);

      expect(topDetections.length).toBeGreaterThan(0);
      expect(topDetections[0].detectionId).toBe('DET-0001');
      expect(topDetections[0].recommendedCount).toBe(2);
    });

    test('should limit to top 10 detections', () => {
      const threats = Array(15)
        .fill(null)
        .map((_, i) => ({
          recommendedDetections: [
            { detectionId: `DET-${i.toString().padStart(4, '0')}`, detectionName: `Det ${i}` },
          ],
        }));

      const topDetections = getTopRecommendedDetections(threats);

      expect(topDetections.length).toBeLessThanOrEqual(10);
    });

    test('should handle threats with no recommendations', () => {
      const threats = [
        {
          recommendedDetections: [],
        },
      ];

      const topDetections = getTopRecommendedDetections(threats);

      expect(topDetections).toEqual([]);
    });
  });
});

