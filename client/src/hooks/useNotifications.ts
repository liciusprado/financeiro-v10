import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Custom hook for managing push notifications
 */
export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();
  const { data: vapidKey } = trpc.finance.getVapidPublicKey.useQuery();
  const subscribeMutation = trpc.finance.subscribeToPush.useMutation();
  const unsubscribeMutation = trpc.finance.unsubscribeFromPush.useMutation();

  useEffect(() => {
    // Check if push notifications are supported
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }

    // Get current subscription
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting permission:", error);
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !vapidKey?.publicKey) {
      console.error("Push notifications not supported or VAPID key missing");
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission if not granted
      if (permission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey),
      });

      // Send subscription to server
      const subscriptionObject = sub.toJSON();
      await subscribeMutation.mutateAsync({
        endpoint: subscriptionObject.endpoint!,
        keys: {
          p256dh: subscriptionObject.keys!.p256dh!,
          auth: subscriptionObject.keys!.auth!,
        },
        userAgent: navigator.userAgent,
      });

      setSubscription(sub);
      utils.finance.getPushSubscriptions.invalidate();
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      setIsLoading(false);
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) {
      return false;
    }

    setIsLoading(true);

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Notify server
      await unsubscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
      });

      setSubscription(null);
      utils.finance.getPushSubscriptions.invalidate();
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      setIsLoading(false);
      return false;
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed: !!subscription,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
