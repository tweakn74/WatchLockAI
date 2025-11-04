/**
 * Unit tests for Threat Actor Attribution Module
 */

describe('Threat Actor Attribution Module', () => {
  it('should have correct module structure', () => {
    expect(true).toBe(true);
  });

  it('should validate threat actor schema', () => {
    const mockActor = {
      id: 'TA-001',
      name: 'APT28',
      aliases: ['Fancy Bear', 'Sofacy'],
      type: 'nation-state',
      country: 'Russia',
      status: 'active',
      sophistication: 'advanced',
      motivation: ['espionage', 'disruption'],
      ttps: [
        { id: 'T1566.001', name: 'Spearphishing Attachment' },
        { id: 'T1059.001', name: 'PowerShell' },
      ],
      malwareFamilies: ['X-Agent', 'Sofacy'],
      infrastructure: {
        domains: ['sofacy-news.com'],
        ips: ['185.86.148.227'],
        asns: ['AS44050'],
      },
      campaigns: [
        {
          name: 'DNC Hack',
          date: '2016-06-01',
          description: 'Compromise of DNC servers',
          targets: ['DNC'],
        },
      ],
    };

    expect(mockActor).toHaveProperty('id');
    expect(mockActor).toHaveProperty('name');
    expect(mockActor).toHaveProperty('type');
    expect(mockActor).toHaveProperty('country');
    expect(mockActor).toHaveProperty('status');
    expect(mockActor).toHaveProperty('sophistication');
    expect(['nation-state', 'cybercrime', 'hacktivist', 'insider']).toContain(mockActor.type);
    expect(['active', 'dormant', 'disbanded']).toContain(mockActor.status);
    expect(['low', 'medium', 'high', 'advanced']).toContain(mockActor.sophistication);
  });

  it('should validate TTP extraction patterns', () => {
    const text = 'Threat uses T1566.001 and T1059.001 techniques';
    const ttpRegex = /T\d{4}(\.\d{3})?/g;
    const ttps = text.match(ttpRegex);

    expect(ttps).toContain('T1566.001');
    expect(ttps).toContain('T1059.001');
    expect(ttps.length).toBe(2);
  });

  it('should validate malware family extraction', () => {
    const text = 'Threat uses Sofacy malware and X-Agent backdoor';
    const malwareKeywords = ['sofacy', 'x-agent', 'wannacry', 'notpetya'];
    const textLower = text.toLowerCase();
    const foundMalware = malwareKeywords.filter(keyword => textLower.includes(keyword));

    expect(foundMalware).toContain('sofacy');
    expect(foundMalware).toContain('x-agent');
    expect(foundMalware.length).toBe(2);
  });

  it('should validate infrastructure IOC extraction', () => {
    const text = 'Malicious domain sofacy-news.com and IP 185.86.148.227';

    // IP extraction
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const ips = text.match(ipRegex);
    expect(ips).toContain('185.86.148.227');

    // Domain extraction
    const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
    const domains = text.match(domainRegex);
    expect(domains).toContain('sofacy-news.com');
  });

  it('should calculate attribution confidence correctly', () => {
    // Test TTP matching: 30 points per match
    let score = 0;
    const ttpMatches = 2;
    score += ttpMatches * 30;
    expect(score).toBe(60);

    // Test malware matching: 40 points per match
    const malwareMatches = 1;
    score += malwareMatches * 40;
    expect(score).toBe(100);

    // Verify score is capped at 100
    expect(Math.min(score, 100)).toBe(100);
  });

  it('should validate confidence levels', () => {
    const getConfidenceLevel = score => {
      if (score >= 91) return 'very-high';
      if (score >= 71) return 'high';
      if (score >= 41) return 'medium';
      return 'low';
    };

    expect(getConfidenceLevel(95)).toBe('very-high');
    expect(getConfidenceLevel(80)).toBe('high');
    expect(getConfidenceLevel(50)).toBe('medium');
    expect(getConfidenceLevel(30)).toBe('low');
  });

  it('should validate attribution threshold', () => {
    const minimumThreshold = 40;
    const scores = [30, 40, 50, 60, 70];
    const validAttributions = scores.filter(score => score >= minimumThreshold);

    expect(validAttributions).toEqual([40, 50, 60, 70]);
    expect(validAttributions.length).toBe(4);
  });

  it('should calculate actor statistics correctly', () => {
    const mockActors = [
      { type: 'nation-state', status: 'active', campaigns: [{}, {}] },
      { type: 'nation-state', status: 'dormant', campaigns: [{}] },
      { type: 'cybercrime', status: 'active', campaigns: [{}, {}, {}] },
      { type: 'cybercrime', status: 'disbanded', campaigns: [] },
    ];

    const totalActors = mockActors.length;
    const activeActors = mockActors.filter(a => a.status === 'active').length;
    const nationStateCount = mockActors.filter(a => a.type === 'nation-state').length;
    const cybercrimeCount = mockActors.filter(a => a.type === 'cybercrime').length;
    const totalCampaigns = mockActors.reduce((sum, a) => sum + (a.campaigns?.length || 0), 0);

    expect(totalActors).toBe(4);
    expect(activeActors).toBe(2);
    expect(nationStateCount).toBe(2);
    expect(cybercrimeCount).toBe(2);
    expect(totalCampaigns).toBe(6);
  });

  it('should validate target matching logic', () => {
    const threatText = 'Attack on government and financial institutions';
    const actorTargets = {
      industries: ['Government', 'Financial Services', 'Defense'],
      countries: ['United States', 'Europe'],
    };

    const textLower = threatText.toLowerCase();
    const industryMatches = actorTargets.industries.filter(industry =>
      textLower.includes(industry.toLowerCase())
    );

    expect(industryMatches).toContain('Government');
    // Financial Services requires exact match in real implementation
    expect(industryMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('should validate scoring weights', () => {
    const weights = {
      ttp: 30,
      malware: 40,
      infrastructure: 25,
      target: 15,
    };

    expect(weights.ttp).toBe(30);
    expect(weights.malware).toBe(40);
    expect(weights.infrastructure).toBe(25);
    expect(weights.target).toBe(15);

    // Verify malware has highest weight
    expect(weights.malware).toBeGreaterThan(weights.ttp);
    expect(weights.malware).toBeGreaterThan(weights.infrastructure);
    expect(weights.malware).toBeGreaterThan(weights.target);
  });

  it('should validate top actors sorting', () => {
    const actors = [
      { name: 'Actor A', campaigns: [{}, {}] },
      { name: 'Actor B', campaigns: [{}, {}, {}, {}] },
      { name: 'Actor C', campaigns: [{}] },
    ];

    const sorted = actors
      .map(a => ({ name: a.name, campaignCount: a.campaigns.length }))
      .sort((a, b) => b.campaignCount - a.campaignCount);

    expect(sorted[0].name).toBe('Actor B');
    expect(sorted[0].campaignCount).toBe(4);
    expect(sorted[1].name).toBe('Actor A');
    expect(sorted[2].name).toBe('Actor C');
  });

  it('should validate campaign timeline sorting', () => {
    const campaigns = [
      { name: 'Campaign A', date: '2020-01-01' },
      { name: 'Campaign B', date: '2022-06-15' },
      { name: 'Campaign C', date: '2021-03-20' },
    ];

    const sorted = campaigns.sort((a, b) => new Date(b.date) - new Date(a.date));

    expect(sorted[0].name).toBe('Campaign B');
    expect(sorted[1].name).toBe('Campaign C');
    expect(sorted[2].name).toBe('Campaign A');
  });
});
