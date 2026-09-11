import { agentApi } from '@/modules/asset/api'

export const getHostAgentInfos = hostIds =>
  hostIds?.length ? agentApi.getHostAgentInfo(hostIds) : Promise.resolve([])
export const generateEnrollmentToken = agentApi.createEnrollmentToken
export const revokeEnrollmentToken = agentApi.revokeEnrollmentToken
export const getPendingAgents = agentApi.getPendingAgents
export const bindAgent = agentApi.bindAgent
export const bindAgentGateway = payload => agentApi.bindAgent({ ...payload, mode: 'gateway' })
export const unbindAgent = agentApi.unbindAgent
export { AGENT_ERROR_MESSAGES, getAgentErrorMessage } from '@/modules/asset/utils/agentErrors'
