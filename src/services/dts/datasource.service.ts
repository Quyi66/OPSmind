/**
 * DTS Datasource Service (Vue/TS)
 * Implements the same interface as the legacy AngularJS datasourceService:
 * - getJdbcDrivers
 * - findAllDatasources
 * - findDatasource
 * - saveDatasource
 * - deleteDatasource
 * - testConnectivity
 * - doQuery
 */

import { apiService } from '@/core/api'
import type {
  Datasource,
  JdbcDriver,
  ConnectivityTestResult,
  QueryParams,
  QueryRequest,
  QueryResult
} from '@/types/dts'

// DTS API prefix - confirmed backend uses '/dts/api/dts'
const DTS_PREFIX = (import.meta as any).env?.VITE_DTS_API_PREFIX || '/dts/api/dts'

function getJdbcDrivers(): JdbcDriver[] {
  return [
    {
      dbName: 'MySQL 5.x, MariaDB',
      className: 'com.mysql.jdbc.Driver',
      urlTemplate: 'jdbc:mysql://<server>:<port>/<databaseName>',
      validationQuery: 'SELECT 1 from dual'
    },
    {
      dbName: 'Oracle 11g',
      className: 'oracle.jdbc.driver.OracleDriver',
      urlTemplate: 'jdbc:oracle:thin:@<server>:<port>:<sid_name>',
      validationQuery: 'SELECT 1 from dual'
    },
    {
      dbName: 'Microsoft SQL Server',
      className: 'com.microsoft.sqlserver.jdbc.SQLServerDriver',
      urlTemplate: 'jdbc:sqlserver://<server>:<port>;DatabaseName=<databaseName>',
      validationQuery: "SELECT 'x'"
    },
    {
      dbName: 'IBM DB2',
      className: 'com.ibm.db2.jcc.DB2Driver',
      urlTemplate: 'jdbc:db2://<server>:<port>/<databaseName>',
      validationQuery: 'SELECT 1 FROM sysibm.sysdummy1'
    },
    {
      dbName: 'Voltdb',
      className: 'org.voltdb.jdbc.Driver',
      urlTemplate: 'jdbc:voltdb://<server>:<port>',
      validationQuery: 'SELECT 1'
    },
    {
      dbName: 'Apache Hive',
      className: 'org.apache.hive.jdbc.HiveDriver',
      urlTemplate: 'jdbc:hive2://<server>:<port>/<databaseName>',
      validationQuery: 'SELECT 1'
    },
    {
      dbName: 'Gauss',
      className: 'com.huawei.gauss.jdbc.ZenithDriver',
      urlTemplate: 'jdbc:zenith:@<server>:<port>',
      validationQuery: 'SELECT 1 from dual'
    },
    {
      dbName: 'AS400',
      className: 'com.ibm.as400.access.AS400JDBCDriver',
      urlTemplate: 'jdbc:as400://<server>:<port>',
      validationQuery: 'SELECT 1 from dual'
    }
    // 其他类型可按需补充
  ]
}

async function findAllDatasources(): Promise<Datasource[]> {
  const res = await apiService.get(`${DTS_PREFIX}/datasources`, { cache: false })
  return res?.data ?? []
}

async function findDatasource(id: string): Promise<Datasource | null> {
  if (!id) throw new Error('Empty argument `id`')
  const safeId = encodeURIComponent(id)
  const res = await apiService.get(`${DTS_PREFIX}/datasources/${safeId}`, { cache: false })
  return res?.data ?? null
}

async function saveDatasource(ds: Datasource): Promise<Datasource> {
  if (!ds) throw new Error('Empty argument `datasource`')

  // 使用 PUT 方法保存
  const res = await apiService.put(`${DTS_PREFIX}/datasources`, ds, {
    params: { cacheBuster: Date.now() }
  })
  return res?.data ?? ds
}

async function deleteDatasource(id: string): Promise<void> {
  if (!id) throw new Error('Empty argument `id`')
  const safeId = encodeURIComponent(id)
  await apiService.delete(`${DTS_PREFIX}/datasources/${safeId}`)
}

async function testConnectivity(datasource: string | Datasource): Promise<ConnectivityTestResult> {
  if (!datasource) throw new Error('Empty argument `datasource`')

  if (typeof datasource === 'string') {
    const safeId = encodeURIComponent(datasource)
    const res = await apiService.get(`${DTS_PREFIX}/datasources/test/${safeId}`)
    return res?.data ?? { success: false }
  } else {
    const res = await apiService.post(`${DTS_PREFIX}/datasources/test`, datasource, {
      params: { cacheBuster: Date.now() }
    })
    return res?.data ?? { success: false }
  }
}

/**
 * Execute DTS dataset query
 * - Endpoint example: /sjxy-console/dts/api/dts/q/data/{datasetId}
 * - Request body: { params, page, size, filter }
 * - Response body: { total, records, ... }
 */
async function doQuery<T = any>(
  datasetId: string,
  options: QueryParams | QueryRequest = {}
): Promise<QueryResult<T>> {
  if (!datasetId) throw new Error('Empty argument `datasetId`')
  const safeId = encodeURIComponent(datasetId)

  // Backward compatibility: if a plain params object is passed, wrap into { params }
  const isPlainParams =
    options &&
    (typeof options !== 'object' || (options && !('page' in options) && !('size' in options) && !('filter' in options) && !('params' in options)))

  const body: QueryRequest = isPlainParams
    ? { params: options as QueryParams }
    : (options as QueryRequest)

  // Use confirmed valid path with trailing slash
  const res = await apiService.post(`${DTS_PREFIX}/q/data/${safeId}/`, body, {
    params: { cacheBuster: Date.now() }
  })
  return res?.data ?? {}
}

export const datasourceService = {
  getJdbcDrivers,
  findAllDatasources,
  findDatasource,
  saveDatasource,
  deleteDatasource,
  testConnectivity,
  doQuery
}

export default datasourceService
