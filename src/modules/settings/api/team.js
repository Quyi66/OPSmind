/**
 * 团队管理 API
 */
import { apiService } from '@/core/api'

/**
 * 获取团队列表
 * GET /api/team
 */
export function getTeams() {
  return apiService.get('/api/team')
}

/**
 * 获取团队详情
 * GET /api/team/:id
 */
export function getTeamDetail(id) {
  return apiService.get(`/api/team/${id}`)
}

/**
 * 创建团队
 * POST /api/team
 */
export function createTeam(team) {
  return apiService.post('/api/team', team)
}

/**
 * 更新团队
 * POST /api/team
 */
export function updateTeam(team) {
  return apiService.post('/api/team', team)
}

/**
 * 删除团队
 * DELETE /api/team/:id
 */
export function deleteTeam(id) {
  return apiService.delete(`/api/team/${id}`)
}

/**
 * 获取团队成员
 * GET /api/team/:id/users
 */
export function getTeamUsers(teamId) {
  return apiService.get(`/api/team/${teamId}/users`)
}

/**
 * 更新团队成员
 * PUT /api/team/:id/users
 */
export function updateTeamUsers(teamId, userIds) {
  return apiService.put(`/api/team/${teamId}/users`, userIds)
}

export default {
  getTeams,
  getTeamDetail,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamUsers,
  updateTeamUsers
}
