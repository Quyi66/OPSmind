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
  name?: string
  description?: string | null
  driverClassName?: string
  url?: string
  username?: string
  password?: string
  validationQuery?: string
  options?: Record<string, any>
  /**
   * Allow extra backend-specific fields
   */
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
