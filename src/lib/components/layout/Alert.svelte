<script lang="ts">
  import { AlertCircle, CheckCircle2, XCircle, X } from '@lucide/svelte';
  import { fade } from 'svelte/transition';

  type AlertType = 'error' | 'success' | 'info' | 'warning';

  interface AlertMessage {
    type: AlertType;
    message: string;
    id: number;
  }

  // Create stores for managing alerts
  let alerts = $state<AlertMessage[]>([]);
  
  // Auto-remove alerts after 5 seconds
  const ALERT_TIMEOUT = 5000;

  export function showAlert(type: AlertType, message: string) {
    const id = Date.now();
    alerts = [...alerts, { type, message, id }];
    
    setTimeout(() => {
      removeAlert(id);
    }, ALERT_TIMEOUT);
  }

  function removeAlert(id: number) {
    alerts = alerts.filter(alert => alert.id !== id);
  }

  // Helper function to get alert style based on type
  function getAlertClass(type: AlertType): string {
    const baseClass = 'alert flex items-center justify-between';
    switch (type) {
      case 'error':
        return `${baseClass} alert-error`;
      case 'success':
        return `${baseClass} alert-success`;
      case 'warning':
        return `${baseClass} alert-warning`;
      case 'info':
        return `${baseClass} alert-info`;
      default:
        return baseClass;
    }
  }

  function getIcon(type: AlertType) {
    switch (type) {
      case 'error':
        return XCircle;
      case 'success':
        return CheckCircle2;
      case 'warning':
      case 'info':
        return AlertCircle;
    }
  }
</script>

<div class="toast toast-top toast-end z-50">
  {#each alerts as alert (alert.id)}
    <div
      transition:fade={{ duration: 200 }}
      class={getAlertClass(alert.type)}
      role="alert"
    >
      <div class="flex gap-2 items-center">
        <svelte:component
          this={getIcon(alert.type)}
          class="h-5 w-5"
        />
        <span>{alert.message}</span>
      </div>
      <button
        class="btn btn-ghost btn-sm"
        onclick={() => removeAlert(alert.id)}
        aria-label="Close alert"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  {/each}
</div>