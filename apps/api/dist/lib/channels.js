/** Canal de eventos por tenant/filial (alinhado à arquitetura do produto). */
export function eventsChannel(tenantId, branchId) {
    return `t:${tenantId}:b:${branchId}:events`;
}
//# sourceMappingURL=channels.js.map