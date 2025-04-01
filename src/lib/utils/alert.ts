import type { AlertType } from "$lib/components/layout/Alert.svelte";

let showAlertFunction: ((type: AlertType, message: string) => void) | null =
  null;

export function setShowAlert(fn: (type: AlertType, message: string) => void) {
  showAlertFunction = fn;
}

export function showAlert(type: AlertType, message: string) {
  if (showAlertFunction) {
    showAlertFunction(type, message);
  } else {
    console.warn("Alert function not initialized");
  }
}
