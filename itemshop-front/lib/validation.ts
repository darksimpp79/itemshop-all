/**
 * Client-side form validation utilities
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate Minecraft player nick
 * Rules: 3-16 alphanumeric characters and underscores
 */
export function validatePlayerNick(nick: string): ValidationError | null {
  const trimmed = nick.trim();

  if (!trimmed) {
    return { field: "nick", message: "Nick nie może być pusty" };
  }

  if (trimmed.length < 3) {
    return { field: "nick", message: "Nick musi mieć co najmniej 3 znaki" };
  }

  if (trimmed.length > 16) {
    return { field: "nick", message: "Nick może mieć maksymalnie 16 znaków" };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      field: "nick",
      message: "Nick może zawierać tylko litery, cyfry i underscore (_)",
    };
  }

  return null;
}

/**
 * Validate product selection
 */
export function validateProductSelection(
  productId: number | null
): ValidationError | null {
  if (!productId || productId <= 0) {
    return { field: "product", message: "Wybierz produkt" };
  }

  return null;
}

/**
 * Validate mode
 */
export function validateMode(mode: string): ValidationError | null {
  if (!mode || !mode.trim()) {
    return { field: "mode", message: "Tryb nie może być pusty" };
  }

  return null;
}

/**
 * Validate price
 */
export function validatePrice(price: number): ValidationError | null {
  if (price <= 0) {
    return { field: "price", message: "Cena musi być większa niż 0" };
  }

  return null;
}

/**
 * Batch validation
 */
export function validate(
  validators: Array<() => ValidationError | null>
): ValidationError | null {
  for (const validator of validators) {
    const error = validator();
    if (error) return error;
  }
  return null;
}
