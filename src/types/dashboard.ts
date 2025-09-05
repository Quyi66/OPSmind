/**
 * Dashboard full data API types
 */

export interface TotalJobStats {
  restJobs: number
  scriptJobs: number
  commandJobs: number
}

export interface RecentJobStatItem {
  date: string // MM-DD
  restJobs: number
  scriptJobs: number
  commandJobs: number
  totalJobs: number
}

export interface MonthlyInspectionStats {
  monthlyInspections: number
  normalInspections: number
  abnormalInspections: number
}

export interface RecentInspectionStatItem {
  date: string // MM-DD
  totalInspections: number
  normalInspections: number
  abnormalInspections: number
}

export interface AssetOverview {
  linuxServers: number
  unixServers: number
  windowsServers: number
}

export interface VulnerabilityOverview {
  critical: number
  high: number
  medium: number
  low: number
}

export interface WindowsVulnStats {
  totalCritical: number
  totalRollups: number
  totalSecurity: number
}

export interface DashboardFullData {
  totalJobStats: TotalJobStats
  recentJobStats: RecentJobStatItem[]
  monthlyInspectionStats: MonthlyInspectionStats
  recentInspectionStats: RecentInspectionStatItem[]
  assetOverview: AssetOverview
  vulnerabilityOverview: VulnerabilityOverview
  windowsVulnStats: WindowsVulnStats
}

