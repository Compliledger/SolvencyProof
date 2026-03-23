export type ReportStatus = "Verified" | "Pending" | "Failed" | "Draft";

export type VerifiedReport = {
  id: string;
  epochId: string;
  status: ReportStatus;
  reservesTotal: number;
  liabilitiesTotal: number;
  liabilitiesRoot: string;
  method: string;
  publishedAt: string;
  updatedAt: string;
  notes?: string;
  artifacts: {
    proof: string;
    publicSignals: string;
    report: string;
  };
};

export type InclusionProof = {
  reportId: string;
  userId: string;
  amount: number;
  proof: string[];
  leafHash: string;
  issuedAt: string;
};

export const mockReports: VerifiedReport[] = [
  {
    id: "RPT-2026-001",
    epochId: "EPOCH-2026-01-24",
    status: "Verified",
    reservesTotal: 128_450_000_000,
    liabilitiesTotal: 114_687_500_000,
    liabilitiesRoot: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    method: "ZK-SNARK (Groth16)",
    publishedAt: "2026-01-24T10:30:00Z",
    updatedAt: "2026-01-24T10:35:00Z",
    notes: "Q1 2026 verification complete",
    artifacts: {
      proof: "proof_2026_001.json",
      publicSignals: "public_signals_2026_001.json",
      report: "report_2026_001.json"
    }
  },
  {
    id: "RPT-2026-002",
    epochId: "EPOCH-2026-01-17",
    status: "Verified",
    reservesTotal: 126_010_000_000,
    liabilitiesTotal: 116_675_925_925,
    liabilitiesRoot: "0x3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d",
    method: "ZK-SNARK (Groth16)",
    publishedAt: "2026-01-17T14:10:00Z",
    updatedAt: "2026-01-17T14:15:00Z",
    artifacts: {
      proof: "proof_2026_002.json",
      publicSignals: "public_signals_2026_002.json",
      report: "report_2026_002.json"
    }
  },
  {
    id: "RPT-2026-003",
    epochId: "EPOCH-2026-01-10",
    status: "Verified",
    reservesTotal: 125_220_000_000,
    liabilitiesTotal: 108_886_956_521,
    liabilitiesRoot: "0x2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
    method: "ZK-SNARK (Groth16)",
    publishedAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-01-10T09:05:00Z",
    artifacts: {
      proof: "proof_2026_003.json",
      publicSignals: "public_signals_2026_003.json",
      report: "report_2026_003.json"
    }
  },
  {
    id: "RPT-2025-052",
    epochId: "EPOCH-2025-12-27",
    status: "Verified",
    reservesTotal: 124_900_000_000,
    liabilitiesTotal: 113_545_454_545,
    liabilitiesRoot: "0xfcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9",
    method: "ZK-SNARK (Groth16)",
    publishedAt: "2025-12-27T16:45:00Z",
    updatedAt: "2025-12-27T16:50:00Z",
    artifacts: {
      proof: "proof_2025_052.json",
      publicSignals: "public_signals_2025_052.json",
      report: "report_2025_052.json"
    }
  },
  {
    id: "RPT-2025-051",
    epochId: "EPOCH-2025-12-20",
    status: "Verified",
    reservesTotal: 123_750_000_000,
    liabilitiesTotal: 117_857_142_857,
    liabilitiesRoot: "0x185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969",
    method: "ZK-SNARK (Groth16)",
    publishedAt: "2025-12-20T11:30:00Z",
    updatedAt: "2025-12-20T11:35:00Z",
    artifacts: {
      proof: "proof_2025_051.json",
      publicSignals: "public_signals_2025_051.json",
      report: "report_2025_051.json"
    }
  },
  {
    id: "RPT-2026-004",
    epochId: "EPOCH-2026-01-31",
    status: "Pending",
    reservesTotal: 130_000_000_000,
    liabilitiesTotal: 110_169_491_525,
    liabilitiesRoot: "0x4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    method: "ZK-SNARK (Groth16)",
    publishedAt: "2026-01-31T00:00:00Z",
    updatedAt: "2026-01-30T18:00:00Z",
    notes: "Awaiting final verification",
    artifacts: {
      proof: "proof_2026_004.json",
      publicSignals: "public_signals_2026_004.json",
      report: "report_2026_004.json"
    }
  },
  {
    id: "RPT-2025-050",
    epochId: "EPOCH-2025-12-13",
    status: "Failed",
    reservesTotal: 88_000_000_000,
    liabilitiesTotal: 89_795_918_367,
    liabilitiesRoot: "0xef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
    method: "ZK-SNARK (Groth16)",
    publishedAt: "2025-12-13T08:00:00Z",
    updatedAt: "2025-12-13T08:05:00Z",
    notes: "Verification failed - reserves below liabilities",
    artifacts: {
      proof: "proof_2025_050.json",
      publicSignals: "public_signals_2025_050.json",
      report: "report_2025_050.json"
    }
  }
];

export const mockInclusionProofs: InclusionProof[] = [
  {
    reportId: "RPT-2026-001",
    userId: "USR-001",
    amount: 15000,
    proof: [
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba"
    ],
    leafHash: "0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef",
    issuedAt: "2026-01-24T10:35:00Z"
  },
  {
    reportId: "RPT-2026-001",
    userId: "USR-002",
    amount: 25000,
    proof: [
      "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
      "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeee",
      "0x0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff"
    ],
    leafHash: "0xaaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666000011112222",
    issuedAt: "2026-01-24T10:36:00Z"
  },
  {
    reportId: "RPT-2026-002",
    userId: "USR-001",
    amount: 14500,
    proof: [
      "0x2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff",
      "0x3333444455556666777788889999000011112222aaaabbbbccccddddeeee",
      "0x4444555566667777888899990000111122223333aaaabbbbccccddddeeeeffff"
    ],
    leafHash: "0xbbbb2222cccc3333dddd4444eeee5555ffff6666000011112222aaaa1111",
    issuedAt: "2026-01-17T14:20:00Z"
  }
];

export function coverageRatio(report: VerifiedReport) {
  if (report.liabilitiesTotal <= 0) return 0;
  return report.reservesTotal / report.liabilitiesTotal;
}

export function getReportById(id: string): VerifiedReport | undefined {
  return mockReports.find(r => r.id === id);
}

export function getLatestVerifiedReport(): VerifiedReport | undefined {
  return mockReports
    .filter(r => r.status === "Verified")
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];
}

export function verifyInclusion(
  reportId: string,
  userId: string,
  amount: number
): { success: boolean; reason?: string } {
  const report = getReportById(reportId);

  if (!report) {
    return { success: false, reason: "REPORT_NOT_FOUND" };
  }

  const validProof = mockInclusionProofs.find(
    p => p.reportId === reportId && p.userId === userId && p.amount === amount
  );

  if (!validProof) {
    return { success: false, reason: "PROOF_INVALID" };
  }

  return { success: true };
}
