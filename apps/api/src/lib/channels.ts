/** Canal de eventos por tenant/filial (alinhado à arquitetura do produto). */
export function eventsChannel(tenantId: string, branchId: string): string {
  return `t:${tenantId}:b:${branchId}:events`;
}
