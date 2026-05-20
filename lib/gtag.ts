export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-WQE6FX8VET';

declare global {
  interface Window {
    gtag: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

// Track product view
export const trackViewItem = (item: { item_id: string; item_name: string; price: number; currency?: string }) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_item', {
      currency: item.currency || 'INR',
      value: item.price,
      items: [
        {
          item_id: item.item_id,
          item_name: item.item_name,
          price: item.price,
          quantity: 1,
        },
      ],
    });
  }
};

// Track add to cart
export const trackAddToCart = (item: { item_id: string; item_name: string; price: number; currency?: string }) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: item.currency || 'INR',
      value: item.price,
      items: [
        {
          item_id: item.item_id,
          item_name: item.item_name,
          price: item.price,
          quantity: 1,
        },
      ],
    });
  }
};

// Track begin checkout
export const trackBeginCheckout = (items: Array<{ item_id: string; item_name: string; price: number; quantity?: number }>, total: number, currency?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: currency || 'INR',
      value: total,
      items: items.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        quantity: item.quantity || 1,
      })),
    });
  }
};

// Track purchase event
export const trackPurchase = (order: {
  transaction_id: string;
  value: number;
  currency?: string;
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity?: number;
  }>;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: order.transaction_id,
      value: order.value,
      currency: order.currency || 'INR',
      items: order.items.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        quantity: item.quantity || 1,
      })),
    });
  }
};

// Track subscription purchase
export const trackSubscribe = (subscription: {
  method?: string;
  plan_id?: string;
  plan_name?: string;
  value: number;
  currency?: string;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'subscribe', {
      method: subscription.method || 'razorpay',
      plan_id: subscription.plan_id,
      plan_name: subscription.plan_name,
      value: subscription.value,
      currency: subscription.currency || 'INR',
    });
  }
};

// Track custom events
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

