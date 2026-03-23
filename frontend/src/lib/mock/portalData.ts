// ============================================
// SOLVENCY PROOF PORTAL - ENTERPRISE MOCK DATA
// ============================================

// Types
export interface SolvencyReport {
  reportId: string;
  status: 'VERIFIED' | 'PENDING' | 'FAILED';
  publishedAt: string;
  epochTimestamp: string;
  coverageRatio: number;
  reservesTotal: string;
  liabilitiesTotal: string;
  liabilitiesRoot: string;
  verificationMethod: string;
  network: string;
  artifacts: {
    proof: string;
    publicSignals: string;
    report: string;
  };
  notes: string;
  previousReportId: string | null;
  nextReportId: string | null;
}

export interface InclusionProof {
  reportId: string;
  userId: string;
  amount: string;
  leafHash: string;
  proof: string[];
  pathIndices: number[];
  issuedAt: string;
}

export interface DashboardStats {
  latestReportId: string;
  reportsVerified30d: number;
  averageCoverageRatio: number;
  lastPublishedAt: string;
}

export interface Artifact {
  name: string;
  type: 'proof' | 'publicSignals' | 'report' | 'inclusionTemplate';
  size: string;
  hash: string;
  generatedAt: string;
}

export type VerificationErrorCode =
  | 'INVALID_SCHEMA'
  | 'REPORT_ID_MISMATCH'
  | 'USER_ID_MISMATCH'
  | 'AMOUNT_MISMATCH'
  | 'PROOF_INVALID'
  | 'ROOT_MISMATCH';

export interface VerificationResult {
  success: boolean;
  errorCode?: VerificationErrorCode;
  message: string;
  matchedReportId?: string;
  matchedRootHash?: string;
  matchedAmount?: string;
}

// ============================================
// MOCK REPORTS DATA
// ============================================

export const mockReports: SolvencyReport[] = [
  {
    reportId: "epoch-2026-01-15-001",
    status: "VERIFIED",
    publishedAt: "2026-01-15T12:42:18Z",
    epochTimestamp: "2026-01-15T12:30:00Z",
    coverageRatio: 1.12,
    reservesTotal: "125000000.00",
    liabilitiesTotal: "111600000.00",
    liabilitiesRoot: "0x9f2c7a4d8b6e5f1c93e4d0b7f98a23c56d41a8b9e4a12f6c0a9d3f8e1b7c4a2",
    verificationMethod: "ZERO_KNOWLEDGE_PROOF",
    network: "ethereum-sepolia",
    artifacts: {
      proof: "proof-epoch-2026-01-15-001.json",
      publicSignals: "publicSignals-epoch-2026-01-15-001.json",
      report: "report-epoch-2026-01-15-001.json"
    },
    notes: "Solvency verified for declared reserve addresses at epoch timestamp.",
    previousReportId: "epoch-2026-01-08-001",
    nextReportId: null
  },
  {
    reportId: "epoch-2026-01-08-001",
    status: "VERIFIED",
    publishedAt: "2026-01-08T11:55:02Z",
    epochTimestamp: "2026-01-08T11:40:00Z",
    coverageRatio: 1.08,
    reservesTotal: "118500000.00",
    liabilitiesTotal: "109700000.00",
    liabilitiesRoot: "0x4b7e9d1c5f8a2e0b9c6a3f1d8b7e4c9f0a5d2e1b3c8f6a9d7e4b2c1f8a9e7d",
    verificationMethod: "ZERO_KNOWLEDGE_PROOF",
    network: "ethereum-sepolia",
    artifacts: {
      proof: "proof-epoch-2026-01-08-001.json",
      publicSignals: "publicSignals-epoch-2026-01-08-001.json",
      report: "report-epoch-2026-01-08-001.json"
    },
    notes: "Verified solvency with reserve buffer applied.",
    previousReportId: "epoch-2026-01-01-001",
    nextReportId: "epoch-2026-01-15-001"
  },
  {
    reportId: "epoch-2026-01-01-001",
    status: "VERIFIED",
    publishedAt: "2026-01-01T10:30:00Z",
    epochTimestamp: "2026-01-01T10:00:00Z",
    coverageRatio: 1.15,
    reservesTotal: "122000000.00",
    liabilitiesTotal: "106100000.00",
    liabilitiesRoot: "0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
    verificationMethod: "ZERO_KNOWLEDGE_PROOF",
    network: "ethereum-sepolia",
    artifacts: {
      proof: "proof-epoch-2026-01-01-001.json",
      publicSignals: "publicSignals-epoch-2026-01-01-001.json",
      report: "report-epoch-2026-01-01-001.json"
    },
    notes: "New year epoch verification completed successfully.",
    previousReportId: "epoch-2025-12-25-001",
    nextReportId: "epoch-2026-01-08-001"
  },
  {
    reportId: "epoch-2025-12-25-001",
    status: "VERIFIED",
    publishedAt: "2025-12-25T09:15:00Z",
    epochTimestamp: "2025-12-25T09:00:00Z",
    coverageRatio: 1.10,
    reservesTotal: "115000000.00",
    liabilitiesTotal: "104500000.00",
    liabilitiesRoot: "0x2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
    verificationMethod: "ZERO_KNOWLEDGE_PROOF",
    network: "ethereum-sepolia",
    artifacts: {
      proof: "proof-epoch-2025-12-25-001.json",
      publicSignals: "publicSignals-epoch-2025-12-25-001.json",
      report: "report-epoch-2025-12-25-001.json"
    },
    notes: "Holiday epoch verification.",
    previousReportId: "epoch-2025-12-18-001",
    nextReportId: "epoch-2026-01-01-001"
  },
  {
    reportId: "epoch-2025-12-18-001",
    status: "VERIFIED",
    publishedAt: "2025-12-18T14:20:00Z",
    epochTimestamp: "2025-12-18T14:00:00Z",
    coverageRatio: 1.06,
    reservesTotal: "110000000.00",
    liabilitiesTotal: "103800000.00",
    liabilitiesRoot: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    verificationMethod: "ZERO_KNOWLEDGE_PROOF",
    network: "ethereum-sepolia",
    artifacts: {
      proof: "proof-epoch-2025-12-18-001.json",
      publicSignals: "publicSignals-epoch-2025-12-18-001.json",
      report: "report-epoch-2025-12-18-001.json"
    },
    notes: "Standard weekly verification.",
    previousReportId: "epoch-2025-12-11-001",
    nextReportId: "epoch-2025-12-25-001"
  },
  {
    reportId: "epoch-2025-12-11-001",
    status: "VERIFIED",
    publishedAt: "2025-12-11T11:00:00Z",
    epochTimestamp: "2025-12-11T10:30:00Z",
    coverageRatio: 1.09,
    reservesTotal: "112500000.00",
    liabilitiesTotal: "103200000.00",
    liabilitiesRoot: "0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
    verificationMethod: "ZERO_KNOWLEDGE_PROOF",
    network: "ethereum-sepolia",
    artifacts: {
      proof: "proof-epoch-2025-12-11-001.json",
      publicSignals: "publicSignals-epoch-2025-12-11-001.json",
      report: "report-epoch-2025-12-11-001.json"
    },
    notes: "Weekly solvency verification completed.",
    previousReportId: null,
    nextReportId: "epoch-2025-12-18-001"
  }
];

// ============================================
// SAMPLE INCLUSION PROOFS (for testing)
// ============================================

export const sampleInclusionProofs: InclusionProof[] = [
  {
    reportId: "epoch-2026-01-15-001",
    userId: "user_48291",
    amount: "2450.00",
    leafHash: "0x5a3c8d2f7e9b1c4a6f0d8e2c7b9a3d1f5e4c8a6b9f7e2d0a1c4b3d8e9f0a1b2c",
    proof: [
      "0x8a9c4d1f7e2b3c5a6d8f9e0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
      "0x5f7e2b8a9c0d1e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f",
      "0x1c9d0f4e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d"
    ],
    pathIndices: [0, 1, 0],
    issuedAt: "2026-01-15T12:36:00Z"
  },
  {
    reportId: "epoch-2026-01-15-001",
    userId: "user_73842",
    amount: "15780.50",
    leafHash: "0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c",
    proof: [
      "0x2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
      "0x9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
      "0x4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a"
    ],
    pathIndices: [1, 0, 1],
    issuedAt: "2026-01-15T12:37:00Z"
  },
  {
    reportId: "epoch-2026-01-08-001",
    userId: "user_12345",
    amount: "5000.00",
    leafHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
    proof: [
      "0x6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b",
      "0x0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a"
    ],
    pathIndices: [0, 0],
    issuedAt: "2026-01-08T11:45:00Z"
  }
];

// ============================================
// DASHBOARD STATISTICS
// ============================================

export const dashboardStats: DashboardStats = {
  latestReportId: "epoch-2026-01-15-001",
  reportsVerified30d: 4,
  averageCoverageRatio: 1.10,
  lastPublishedAt: "2026-01-15T12:42:18Z"
};

// ============================================
// ARTIFACT METADATA
// ============================================

export function getArtifactsForReport(reportId: string): Artifact[] {
  const report = mockReports.find(r => r.reportId === reportId);
  if (!report) return [];

  return [
    {
      name: report.artifacts.proof,
      type: 'proof',
      size: '2.4 KB',
      hash: '0x' + reportId.replace(/-/g, '').slice(0, 16) + 'a1b2c3d4',
      generatedAt: report.epochTimestamp
    },
    {
      name: report.artifacts.publicSignals,
      type: 'publicSignals',
      size: '1.1 KB',
      hash: '0x' + reportId.replace(/-/g, '').slice(0, 16) + 'e5f6a7b8',
      generatedAt: report.epochTimestamp
    },
    {
      name: report.artifacts.report,
      type: 'report',
      size: '3.8 KB',
      hash: '0x' + reportId.replace(/-/g, '').slice(0, 16) + 'c9d0e1f2',
      generatedAt: report.publishedAt
    },
    {
      name: `inclusion-template-${reportId}.json`,
      type: 'inclusionTemplate',
      size: '0.8 KB',
      hash: '0x' + reportId.replace(/-/g, '').slice(0, 16) + '34567890',
      generatedAt: report.publishedAt
    }
  ];
}

// ============================================
// MOCK REPOSITORY FUNCTIONS
// ============================================

export const MockReportRepository = {
  list: (filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    minRatio?: number;
    maxRatio?: number;
    search?: string;
  }): SolvencyReport[] => {
    let results = [...mockReports];

    if (filters?.status && filters.status !== 'all') {
      results = results.filter(r => r.status === filters.status);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(r =>
        r.reportId.toLowerCase().includes(search)
      );
    }

    if (filters?.minRatio !== undefined) {
      results = results.filter(r => r.coverageRatio >= filters.minRatio!);
    }

    if (filters?.maxRatio !== undefined) {
      results = results.filter(r => r.coverageRatio <= filters.maxRatio!);
    }

    return results;
  },

  get: (reportId: string): SolvencyReport | undefined => {
    return mockReports.find(r => r.reportId === reportId);
  },

  getLatest: (): SolvencyReport => {
    return mockReports[0];
  }
};

export const MockArtifactRepository = {
  download: (reportId: string, artifactType: string): string => {
    const report = MockReportRepository.get(reportId);
    if (!report) return '';

    // Return mock JSON content based on artifact type
    switch (artifactType) {
      case 'proof':
        return JSON.stringify({
          protocol: "groth16",
          curve: "bn128",
          proof: {
            a: ["0x12ab34cd56ef78901234567890abcdef", "0x9f34ab12cd56ef78901234567890abcd"],
            b: [["0x45cd67ef89012345678901234567890a", "0x89ef01234567890abcdef0123456789a"],
                ["0x34aa56bc78de90123456789012345678", "0x77bc89de01234567890abcdef0123456"]],
            c: ["0x98dd01234567890abcdef01234567890", "0x10aa23456789012345678901234567ab"]
          },
          generated_at: report.epochTimestamp
        }, null, 2);

      case 'publicSignals':
        return JSON.stringify({
          epoch_id: report.reportId,
          liabilities_root: report.liabilitiesRoot,
          reserves_total: report.reservesTotal.replace('.', ''),
          buffer_basis_points: 0
        }, null, 2);

      case 'report':
        return JSON.stringify({
          report_id: report.reportId,
          statement: `At epoch ${report.reportId}, total reserves were greater than or equal to total liabilities.`,
          coverage_ratio: report.coverageRatio,
          verified: report.status === 'VERIFIED',
          network: report.network,
          published_at: report.publishedAt
        }, null, 2);

      default:
        return '{}';
    }
  }
};

export const MockInclusionVerifier = {
  verify: (
    reportId: string,
    proof: InclusionProof | null,
    userId: string,
    amount: string
  ): VerificationResult => {
    // Schema validation
    if (!proof || !proof.proof || !Array.isArray(proof.proof) || proof.proof.length === 0) {
      return {
        success: false,
        errorCode: 'INVALID_SCHEMA',
        message: 'The provided proof has an invalid schema. Expected proof array with merkle path.'
      };
    }

    // Report ID check
    if (proof.reportId !== reportId) {
      return {
        success: false,
        errorCode: 'REPORT_ID_MISMATCH',
        message: `Report ID mismatch. Proof is for ${proof.reportId}, but verification requested for ${reportId}.`
      };
    }

    // User ID check
    if (proof.userId !== userId) {
      return {
        success: false,
        errorCode: 'USER_ID_MISMATCH',
        message: `User ID mismatch. Proof is for ${proof.userId}, but verification requested for ${userId}.`
      };
    }

    // Amount check
    if (proof.amount !== amount) {
      return {
        success: false,
        errorCode: 'AMOUNT_MISMATCH',
        message: `Amount mismatch. Proof shows ${proof.amount}, but verification requested for ${amount}.`
      };
    }

    // Get report to verify root
    const report = MockReportRepository.get(reportId);
    if (!report) {
      return {
        success: false,
        errorCode: 'REPORT_ID_MISMATCH',
        message: `Report ${reportId} not found.`
      };
    }

    // Success
    return {
      success: true,
      message: 'Inclusion verified successfully. Your balance was included in the committed liabilities.',
      matchedReportId: reportId,
      matchedRootHash: report.liabilitiesRoot,
      matchedAmount: amount
    };
  },

  getSampleProof: (reportId: string): InclusionProof | null => {
    return sampleInclusionProofs.find(p => p.reportId === reportId) || sampleInclusionProofs[0];
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatCurrency(value: string): string {
  const num = parseFloat(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}×`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export function truncateHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}
