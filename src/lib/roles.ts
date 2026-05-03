import type { ApplicationRole } from '@/store/useAuthStore';

/**
 * Utilitários para verificar permissões de usuário
 */

const ADMIN_ROLE: ApplicationRole = 'NETNOTIFY_ADMIN';
const USER_ROLE: ApplicationRole = 'NETNOTIFY_USER';


export const RolePermissions = {
  SERVER_MANAGER: ['SERVER_MANAGER', ADMIN_ROLE],
  ALERT_MANAGER: ['ALERT_MANAGER', ADMIN_ROLE],
  REPORT_VIEWER: ['REPORT_VIEWER', ADMIN_ROLE],
  MONITORING_VIEWER: ['MONITORING_VIEWER', ADMIN_ROLE],
  NETNOTIFY_USER: [USER_ROLE],
  NETNOTIFY_ADMIN: [ADMIN_ROLE],
} as const;

/**
 * Verifica se o usuário tem uma role específica
 */
export function hasRole(userRoles: ApplicationRole[] | undefined, role: ApplicationRole): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes(role);
}

/**
 * Verifica se o usuário tem uma role de administrador
 */
export function isAdmin(userRoles: ApplicationRole[] | undefined): boolean {
  return hasRole(userRoles, ADMIN_ROLE);
}

/**
 * Verifica se o usuário pode gerenciar servidores
 */
export function canManageServers(userRoles: ApplicationRole[] | undefined): boolean {
  return hasRole(userRoles, 'SERVER_MANAGER') || isAdmin(userRoles);
}

/**
 * Verifica se o usuário pode gerenciar alertas
 */
export function canManageAlerts(userRoles: ApplicationRole[] | undefined): boolean {
  return hasRole(userRoles, 'ALERT_MANAGER') || isAdmin(userRoles);
}

/**
 * Verifica se o usuário pode visualizar relatórios
 */
export function canViewReports(userRoles: ApplicationRole[] | undefined): boolean {
  return hasRole(userRoles, 'REPORT_VIEWER') || isAdmin(userRoles);
}

/**
 * Verifica se o usuário pode visualizar monitoramento
 */
export function canViewMonitoring(userRoles: ApplicationRole[] | undefined): boolean {
  return hasRole(userRoles, 'MONITORING_VIEWER') || isAdmin(userRoles);
}
