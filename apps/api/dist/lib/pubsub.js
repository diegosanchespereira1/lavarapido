import { getRedis } from "./redis.js";
import { eventsChannel } from "./channels.js";
/** Publica atualização quando Redis está disponível. */
export async function publishVehicleEvent(tenantId, branchId, payload) {
    const r = getRedis();
    if (!r)
        return;
    await r.publish(eventsChannel(tenantId, branchId), JSON.stringify(payload));
}
//# sourceMappingURL=pubsub.js.map