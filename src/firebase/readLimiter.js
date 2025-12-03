// Emergency read limiter to prevent excessive Firebase reads during demos
// This implements a cooldown period to prevent rapid re-subscriptions

class ReadLimiter {
  constructor() {
    this.lastSubscriptionTimes = new Map();
    this.cooldownMs = 3000; // 3 seconds minimum between re-subscriptions
  }

  canSubscribe(subscriptionKey) {
    const now = Date.now();
    const lastTime = this.lastSubscriptionTimes.get(subscriptionKey);
    
    if (!lastTime) {
      this.lastSubscriptionTimes.set(subscriptionKey, now);
      return true;
    }

    const timeSinceLastSubscription = now - lastTime;
    if (timeSinceLastSubscription < this.cooldownMs) {
      console.warn(`[ReadLimiter] ⏳ Blocking ${subscriptionKey} - cooldown active (${Math.ceil((this.cooldownMs - timeSinceLastSubscription) / 1000)}s remaining)`);
      return false;
    }

    this.lastSubscriptionTimes.set(subscriptionKey, now);
    return true;
  }

  reset() {
    this.lastSubscriptionTimes.clear();
  }
}

export const readLimiter = new ReadLimiter();
