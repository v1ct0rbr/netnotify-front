import type { ApplicationRole } from '@/store/useAuthStore';

/**
 * Utilitários para verificar permissões de usuário
 */

export const RolePermissions = {
  SERVER_MANAGER: ['SERVER_MANAGER', 'SYSTEM_ADMIN'],
  ALERT_MANAGER: ['ALERT_MANAGER', 'SYSTEM_ADMIN'],
  REPORT_VIEWER: ['REPORT_VIEWER', 'SYSTEM_ADMIN'],
  MONITORING_VIEWER: ['MONITORING_VIEWER', 'SYSTEM_ADMIN'],
  ROLE_USER: ['ROLE_USER', 'SYSTEM_ADMIN'],
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
  return hasRole(userRoles, 'SYSTEM_ADMIN');
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
