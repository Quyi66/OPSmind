/**
 * DTS module types
 */

export interface JdbcDriver {
  dbName: string
  className: string
  urlTemplate: string
  validationQuery: string
}

export interface Datasource {
  id?: string
  tenantId?: string
  name?: string
  type?: 'jdbc' | 'rest' | 'join' | 'es' | 'file' | 'mongo' | 'hbase' | 'orientdb'
  config?: DatasourceConfig | null
  status?: string
  description?: string | null
  createdBy?: string
  creatorName?: string
  createdAt?: string
  modifiedBy?: string | null
  modifierName?: string
  modifiedAt?: string
  datasetDTOList?: any[] | null
  accessControl?: any | null
  action?: string
  [key: string]: any
}

export interface DatasourceConfig {
  driver?: string
  url?: string
  validationQuery?: string
  username?: string
  password?: string
  manager?: string
  [key: string]: any
}

export interface ConnectivityTestResult {
  success: boolean
  message?: string
  details?: any
}

export interface QueryParams {
  [key: string]: any
}

export interface QueryRequest {
  params?: QueryParams | null
  page?: number
  size?: number
  filter?: string
}

export interface QueryResult<T = any> {
  // Common fields used by DTS query endpoints
  total?: number
  records?: T[]

  // Optional variants
  data?: T
  rows?: any[]
  columns?: string[]
  [key: string]: any
}
